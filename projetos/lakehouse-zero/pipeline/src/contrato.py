"""Contrato de negócio independente de plataforma para dados sintéticos.

O Spark no Databricks usa SQL equivalente, mas o teste local NÃO substitui E2E Delta.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation


def eventos_sinteticos() -> list[dict[str, str]]:
    """Conjunto determinístico; todos os identificadores são fictícios."""
    return [
        dict(id_evento="E001", pedido_id="P001", data_pedido="2026-10-01", categoria="Livros", quantidade="2", valor_unitario="10.00", instante_evento="2026-10-01T08:00:00"),
        dict(id_evento="E002", pedido_id="P002", data_pedido="2026-10-01", categoria="Eletronicos", quantidade="1", valor_unitario="20.00", instante_evento="2026-10-01T09:00:00"),
        dict(id_evento="E003", pedido_id="P001", data_pedido="2026-10-01", categoria="Livros", quantidade="3", valor_unitario="10.00", instante_evento="2026-10-01T10:00:00"),
        dict(id_evento="E004", pedido_id="P003", data_pedido="2026-10-02", categoria="Livros", quantidade="-1", valor_unitario="9.50", instante_evento="2026-10-02T08:00:00"),
        dict(id_evento="E005", pedido_id="P004", data_pedido="2026-10-02", categoria="Livros", quantidade="abc", valor_unitario="9.50", instante_evento="2026-10-02T09:00:00"),
        dict(id_evento="E006", pedido_id="P005", data_pedido="2026-10-02", categoria="Livros", quantidade="2", valor_unitario="15.00", instante_evento="2026-10-02T10:00:00"),
        dict(id_evento="E007", pedido_id="P006", data_pedido="2026-10-02", categoria="Livros", quantidade="1", valor_unitario="-2.00", instante_evento="2026-10-02T11:00:00"),
    ]


def validar(evento: dict[str, str]) -> tuple[dict | None, str | None]:
    """Aceita apenas valores inteiros positivos e decimal com duas casas ou menos."""
    try:
        if not evento["pedido_id"].strip() or not evento["categoria"].strip():
            return None, "chave_ou_categoria_vazia"
        dia = date.fromisoformat(evento["data_pedido"])
        quantidade = int(evento["quantidade"])
        if str(quantidade) != evento["quantidade"]:
            return None, "quantidade_invalida"
        try:
            valor = Decimal(evento["valor_unitario"])
        except InvalidOperation:
            return None, "valor_invalido"
        if not valor.is_finite() or valor.as_tuple().exponent < -2:
            return None, "valor_invalido"
        if quantidade <= 0:
            return None, "quantidade_invalida"
        if valor <= 0:
            return None, "valor_invalido"
        return {
            "pedido_id": evento["pedido_id"], "data_pedido": dia.isoformat(),
            "categoria": evento["categoria"], "quantidade": quantidade,
            "valor_unitario": valor.quantize(Decimal("0.01")),
        }, None
    except (ValueError, TypeError, KeyError, OverflowError):
        return None, "tipo_ou_data_invalida"


def consolidar(eventos: list[dict[str, str]]) -> tuple[list[dict], list[dict]]:
    """Escolhe último evento por pedido e separa inválidos sem reutilizar versões antigas."""
    mais_recentes: dict[str, dict[str, str]] = {}
    for evento in eventos:
        datetime.fromisoformat(evento["instante_evento"])
        chave = evento["pedido_id"]
        atual = mais_recentes.get(chave)
        if atual is None or (evento["instante_evento"], evento["id_evento"]) > (atual["instante_evento"], atual["id_evento"]):
            mais_recentes[chave] = evento
    validos, rejeitados = [], []
    for evento in sorted(mais_recentes.values(), key=lambda e: e["pedido_id"]):
        normalizado, motivo = validar(evento)
        if motivo:
            rejeitados.append({"pedido_id": evento["pedido_id"], "id_evento": evento["id_evento"], "motivo": motivo})
        else:
            validos.append(normalizado)
    return validos, rejeitados


def agregar(validos: list[dict]) -> list[dict]:
    grupos: dict[tuple[str, str], dict] = {}
    for pedido in validos:
        chave = (pedido["data_pedido"], pedido["categoria"])
        registro = grupos.setdefault(chave, {"data_pedido": chave[0], "categoria": chave[1], "pedidos": 0, "unidades": 0, "valor_total": Decimal("0.00")})
        registro["pedidos"] += 1
        registro["unidades"] += pedido["quantidade"]
        registro["valor_total"] += pedido["valor_unitario"] * pedido["quantidade"]
    return [grupos[k] for k in sorted(grupos)]
