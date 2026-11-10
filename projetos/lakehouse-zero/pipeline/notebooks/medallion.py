# Databricks notebook source
"""Notebook Databricks: executado pelo Lakeflow Job em 4 tarefas sequenciais.

Somente DEV/sintético. Uso restrito a Databricks Free Edition; não use em produção.
Camadas Delta gerenciadas no catálogo atual, schema `default`, prefixo validado.
"""

# COMMAND ----------
import hashlib
import json
import re
from decimal import Decimal
from pyspark.sql import types as T

dbutils.widgets.dropdown("etapa", "bronze", ["bronze", "silver", "gold", "validar"])
dbutils.widgets.text("prefixo", "demo_medallion_exemplo")
dbutils.widgets.text("esquema", "default")
etapa = dbutils.widgets.get("etapa")
prefixo = dbutils.widgets.get("prefixo")
esquema = dbutils.widgets.get("esquema")

for nome, valor in (("prefixo", prefixo), ("esquema", esquema)):
    if not re.fullmatch(r"[a-z][a-z0-9_]{2,55}", valor):
        raise ValueError(f"{nome} não atende a allowlist de identificadores")
catalogo = spark.sql("SELECT current_catalog()").first()[0]
if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", catalogo):
    raise ValueError("Catálogo atual não é identificador simples; selecione outro manualmente")

def tabela(sufixo):
    return f"`{catalogo}`.`{esquema}`.`{prefixo}_{sufixo}`"

bronze, silver, rejeitados, gold = (tabela(x) for x in ("bronze", "silver", "rejeitados", "gold"))

# COMMAND ----------
if etapa == "bronze":
    entradas = [
        ("E001", "P001", "2026-10-01", "Livros", "2", "10.00", "2026-10-01T08:00:00"),
        ("E002", "P002", "2026-10-01", "Eletronicos", "1", "20.00", "2026-10-01T09:00:00"),
        ("E003", "P001", "2026-10-01", "Livros", "3", "10.00", "2026-10-01T10:00:00"),
        ("E004", "P003", "2026-10-02", "Livros", "-1", "9.50", "2026-10-02T08:00:00"),
        ("E005", "P004", "2026-10-02", "Livros", "abc", "9.50", "2026-10-02T09:00:00"),
        ("E006", "P005", "2026-10-02", "Livros", "2", "15.00", "2026-10-02T10:00:00"),
        ("E007", "P006", "2026-10-02", "Livros", "1", "-2.00", "2026-10-02T11:00:00"),
    ]
    campos = ["id_evento", "pedido_id", "data_pedido", "categoria", "quantidade", "valor_unitario", "instante_evento"]
    schema = T.StructType([T.StructField(c, T.StringType(), False) for c in campos])
    df = spark.createDataFrame(entradas, schema=schema)
    df.createOrReplaceTempView("entrada_medallion_demo")
    spark.sql(f"""CREATE TABLE IF NOT EXISTS {bronze} (
      id_evento STRING, pedido_id STRING, data_pedido STRING, categoria STRING,
      quantidade STRING, valor_unitario STRING, instante_evento STRING
    ) USING DELTA""")
    colisoes = spark.sql(f"""SELECT count(*) AS n
      FROM {bronze} t JOIN entrada_medallion_demo s ON t.id_evento = s.id_evento
      WHERE NOT (t.pedido_id <=> s.pedido_id AND t.data_pedido <=> s.data_pedido
       AND t.categoria <=> s.categoria AND t.quantidade <=> s.quantidade
       AND t.valor_unitario <=> s.valor_unitario AND t.instante_evento <=> s.instante_evento)""").first()[0]
    if colisoes:
        raise RuntimeError("Colisão de id_evento com payload diferente; não executar MERGE")
    spark.sql(f"""MERGE INTO {bronze} t USING entrada_medallion_demo s
      ON t.id_evento = s.id_evento
      WHEN NOT MATCHED THEN INSERT (id_evento,pedido_id,data_pedido,categoria,quantidade,valor_unitario,instante_evento)
      VALUES (s.id_evento,s.pedido_id,s.data_pedido,s.categoria,s.quantidade,s.valor_unitario,s.instante_evento)""")
    print(json.dumps({"etapa": etapa, "bronze_linhas": spark.table(bronze).count()}))

# COMMAND ----------
if etapa == "silver":
    # Último evento do pedido prevalece, mesmo se inválido; dados ruins vão para quarentena.
    definicao = f"""WITH ultimo AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY instante_evento DESC, id_evento DESC) AS rn
      FROM {bronze}
    ), tipado AS (
      SELECT id_evento,pedido_id, categoria, TRY_CAST(data_pedido AS DATE) AS dia,
        TRY_CAST(quantidade AS INT) AS qtd, TRY_CAST(valor_unitario AS DECIMAL(12,2)) AS preco,
        quantidade AS qtd_bruta, valor_unitario AS preco_bruto
      FROM ultimo WHERE rn=1
    ), classificado AS (
      SELECT *, CASE
        WHEN pedido_id IS NULL OR TRIM(pedido_id)='' OR categoria IS NULL OR TRIM(categoria)='' THEN 'chave_ou_categoria_vazia'
        WHEN dia IS NULL THEN 'tipo_ou_data_invalida'
        WHEN qtd IS NULL OR qtd<=0 OR TRIM(qtd_bruta) != CAST(qtd AS STRING) THEN 'quantidade_invalida'
        WHEN preco IS NULL OR preco<=0 OR NOT (TRIM(preco_bruto) RLIKE '^-?[0-9]+(\\.[0-9]{{1,2}})?$') THEN 'valor_invalido'
        ELSE NULL END AS motivo
      FROM tipado
    )"""
    spark.sql(f"""CREATE OR REPLACE TABLE {silver} USING DELTA AS
      {definicao}
      SELECT pedido_id, dia AS data_pedido, categoria, qtd AS quantidade, preco AS valor_unitario
      FROM classificado WHERE motivo IS NULL""")
    spark.sql(f"""CREATE OR REPLACE TABLE {rejeitados} USING DELTA AS
      {definicao}
      SELECT pedido_id, id_evento, motivo FROM classificado WHERE motivo IS NOT NULL""")
    print(json.dumps({"etapa": etapa, "silver_linhas": spark.table(silver).count(), "rejeitados": spark.table(rejeitados).count()}))

# COMMAND ----------
if etapa == "gold":
    spark.sql(f"""CREATE OR REPLACE TABLE {gold} USING DELTA AS
      SELECT data_pedido, categoria, COUNT(*) AS pedidos, SUM(quantidade) AS unidades,
        SUM(CAST(quantidade AS DECIMAL(12,0)) * valor_unitario) AS valor_total
      FROM {silver} GROUP BY data_pedido, categoria""")
    print(json.dumps({"etapa": etapa, "gold_linhas": spark.table(gold).count()}))

# COMMAND ----------
if etapa == "validar":
    # Readback das tabelas reais gerenciadas, não do DataFrame em memória.
    contagens = {nome: spark.sql(f"SELECT COUNT(*) AS n FROM {tabela(nome)}").first()[0]
                 for nome in ("bronze", "silver", "rejeitados", "gold")}
    linhas = [tuple(str(v) for v in r) for r in spark.sql(
        f"SELECT data_pedido,categoria,pedidos,unidades,valor_total FROM {gold} ORDER BY data_pedido,categoria"
    ).collect()]
    soma = spark.sql(f"SELECT SUM(valor_total) AS total FROM {gold}").first()[0]
    esperado = {"bronze": 7, "silver": 3, "rejeitados": 3, "gold": 3}
    assert contagens == esperado, f"Contagens inesperadas: {contagens} != {esperado}"
    assert Decimal(str(soma)) == Decimal("80.00"), f"Faturamento inesperado: {soma}"
    assert len(linhas) == 3 and sum(int(r[2]) for r in linhas) == 3
    evidencia = {
        "estado": "PASSED", "etapa": etapa, "catalogo": catalogo, "esquema": esquema,
        "prefixo": prefixo, "contagens": contagens, "valor_total": str(soma),
        "checksum_gold": hashlib.sha256(json.dumps(linhas, sort_keys=True).encode()).hexdigest(),
        "observacao": "A comprovação real requer salvar run_id/job_id, SHA do código e leitura independente no Databricks."
    }
    print("EVIDENCIA_MEDALLION=" + json.dumps(evidencia, ensure_ascii=False, sort_keys=True))
