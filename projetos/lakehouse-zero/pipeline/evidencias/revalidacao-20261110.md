# Revalidação local — 10/11/2026

- Ambiente: sandbox Python 3.13.5 (não um PC/runner do usuário).
- Origem: pacote preservado `fluxo_medallion_zero.zip` SHA-256 `5e9920fe5c6c23b6e7e61415d48415ddebd494552894a815066c3ccbf9051a48`.
- Comando executado: `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -v`.
- Resultado observado: **6 testes executados e aprovados** (casos positivos/negativos, colisão, readback, replay, dados sintéticos).
- As 11 versões de arquivos do ZIP foram verificadas por Git blob SHA na branch remota.
- Regras atuais consultadas: 1.6.21, `58dcd4200f412a866278027ba9e433439a03f3b3`.
- Não executados: Databricks Free Edition, SQL Spark/Delta, DuckDB, host físico, mudança de cluster ou workspace.
- Checkpoint remoto Drive: upload + download completos, digest original e digest de readback idênticos.
- Não concluído: CI pós-push, Validator independente SHA-bound, READY_FOR_PR, PR draft, E2E Databricks e sincronização TODO Global.
