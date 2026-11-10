"""Ensaio persistente em SQLite (não é a execução Databricks/Delta)."""
from __future__ import annotations

import argparse
import json
import sqlite3
from decimal import Decimal
from pathlib import Path
from .contrato import agregar, consolidar, eventos_sinteticos

SCHEMA = """
CREATE TABLE IF NOT EXISTS bronze (
 id_evento TEXT PRIMARY KEY, pedido_id TEXT NOT NULL, data_pedido TEXT NOT NULL,
 categoria TEXT NOT NULL, quantidade TEXT NOT NULL, valor_unitario TEXT NOT NULL,
 instante_evento TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS silver (
 pedido_id TEXT PRIMARY KEY, data_pedido TEXT NOT NULL, categoria TEXT NOT NULL,
 quantidade INTEGER NOT NULL, valor_unitario TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rejeitados (
 pedido_id TEXT PRIMARY KEY, id_evento TEXT NOT NULL, motivo TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gold (
 data_pedido TEXT NOT NULL, categoria TEXT NOT NULL, pedidos INTEGER NOT NULL,
 unidades INTEGER NOT NULL, valor_total TEXT NOT NULL, PRIMARY KEY (data_pedido,categoria));
"""
CAMPOS = ("id_evento", "pedido_id", "data_pedido", "categoria", "quantidade", "valor_unitario", "instante_evento")


def executar(caminho: Path, entrada: list[dict[str, str]] | None = None) -> dict:
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    eventos = eventos_sinteticos() if entrada is None else entrada
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    try:
        con.executescript(SCHEMA)
        with con:
            for evento in eventos:
                dados = tuple(evento[c] for c in CAMPOS)
                anterior = con.execute("SELECT * FROM bronze WHERE id_evento=?", (evento["id_evento"],)).fetchone()
                if anterior and tuple(anterior[c] for c in CAMPOS) != dados:
                    raise ValueError(f"Colisão de id_evento: {evento['id_evento']}")
                con.execute("INSERT OR IGNORE INTO bronze VALUES (?,?,?,?,?,?,?)", dados)
            existentes = [dict(row) for row in con.execute("SELECT * FROM bronze")]
            validos, rejeitados = consolidar(existentes)
            gold = agregar(validos)
            for tabela in ("silver", "rejeitados", "gold"):
                con.execute(f"DELETE FROM {tabela}")
            for v in validos:
                con.execute("INSERT INTO silver VALUES (?,?,?,?,?)", (v["pedido_id"],v["data_pedido"],v["categoria"],v["quantidade"],str(v["valor_unitario"])))
            for r in rejeitados:
                con.execute("INSERT INTO rejeitados VALUES (?,?,?)", (r["pedido_id"],r["id_evento"],r["motivo"]))
            for g in gold:
                con.execute("INSERT INTO gold VALUES (?,?,?,?,?)", (g["data_pedido"],g["categoria"],g["pedidos"],g["unidades"],str(g["valor_total"])))
    finally:
        con.close()
    return leitura_independente(caminho)


def leitura_independente(caminho: Path) -> dict:
    """Nova conexão para verificar efeito persistido; não confia no retorno do produtor."""
    with sqlite3.connect(caminho) as con:
        totais = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("bronze", "silver", "rejeitados", "gold")}
        linhas = con.execute("SELECT data_pedido,categoria,pedidos,unidades,valor_total FROM gold ORDER BY data_pedido,categoria").fetchall()
    valor_total = sum((Decimal(r[4]) for r in linhas), Decimal("0.00"))
    if totais != {"bronze": 7, "silver": 3, "rejeitados": 3, "gold": 3} or valor_total != Decimal("80.00"):
        raise AssertionError(f"Leitura persistida divergente: {totais}; total={valor_total}")
    return {"camadas": totais, "valor_total": str(valor_total), "gold": [dict(data_pedido=r[0], categoria=r[1], pedidos=r[2], unidades=r[3], valor_total=r[4]) for r in linhas]}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=Path("saida/demo_medallion.sqlite"))
    args = ap.parse_args()
    print(json.dumps(executar(args.db), ensure_ascii=False, sort_keys=True, indent=2))
