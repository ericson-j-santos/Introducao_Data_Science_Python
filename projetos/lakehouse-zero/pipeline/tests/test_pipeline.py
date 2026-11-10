import sqlite3
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from src.contrato import agregar, consolidar, eventos_sinteticos
from src.demo_local import executar, leitura_independente


class ContratoTests(unittest.TestCase):
    def test_cenario_positivo_negativo(self):
        validos, rejeitados = consolidar(eventos_sinteticos())
        self.assertEqual([v["pedido_id"] for v in validos], ["P001", "P002", "P005"])
        self.assertEqual(len(rejeitados), 3)
        self.assertEqual(sum((g["valor_total"] for g in agregar(validos)), Decimal("0")), Decimal("80.00"))
        self.assertEqual(next(v["quantidade"] for v in validos if v["pedido_id"] == "P001"), 3)

    def test_ultima_versao_invalida_rejeita_pedido(self):
        eventos = eventos_sinteticos() + [dict(eventos_sinteticos()[0], id_evento="E008", quantidade="-10", instante_evento="2026-10-03T08:00:00")]
        validos, rejeitados = consolidar(eventos)
        self.assertNotIn("P001", [r["pedido_id"] for r in validos])
        self.assertIn("P001", [r["pedido_id"] for r in rejeitados])

    def test_e2e_sqlite_replay_e_readback(self):
        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / "e2e.sqlite"
            antes = executar(arq)
            depois = executar(arq)
            self.assertEqual(antes, depois)
            self.assertEqual(leitura_independente(arq), antes)
            with sqlite3.connect(arq) as con:
                self.assertEqual(con.execute("SELECT COUNT(DISTINCT id_evento) FROM bronze").fetchone()[0], 7)

    def test_colisao_de_evento_falha_fechado(self):
        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / "e2e.sqlite"
            snapshot = executar(arq)
            entrada = eventos_sinteticos()
            entrada[0]["quantidade"] = "100"
            with self.assertRaisesRegex(ValueError, "Colisão"):
                executar(arq, entrada)
            self.assertEqual(leitura_independente(arq), snapshot)

    def test_detector_de_evidencia_rejeita_gold_corrompida(self):
        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / "e2e.sqlite"
            executar(arq)
            with sqlite3.connect(arq) as con:
                con.execute("UPDATE gold SET valor_total=? WHERE categoria=?", ("999.00", "Livros"))
            with self.assertRaisesRegex(AssertionError, "Leitura persistida divergente"):
                leitura_independente(arq)

    def test_fixture_nao_contem_dados_pessoais(self):
        eventos = eventos_sinteticos()
        self.assertEqual(len({e['id_evento'] for e in eventos}), len(eventos))
        self.assertTrue(all(set(e) == {"id_evento", "pedido_id", "data_pedido", "categoria", "quantidade", "valor_unitario", "instante_evento"} for e in eventos))


if __name__ == "__main__":
    unittest.main()
