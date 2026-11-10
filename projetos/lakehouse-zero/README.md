# Lakehouse Zero — Bronze / Silver / Gold

Protótipo em português brasileiro para planejar, testar e rastrear o primeiro fluxo Medallion com dados **exclusivamente sintéticos**.

## Conteúdo

- `pipeline/`: pacote canônico recuperado do artefato `fluxo_medallion_zero.zip`, com notebook Databricks, template de orquestração, contratos, ensaio SQLite e testes.
- `site/`: espelho íntegro dos 10 arquivos do site React/Vite publicado no AppDeploy em snapshot `1794271535460`.
- `.github/workflows/lakehouse-zero.yml` (na raiz do repositório): testes Python locais sem Docker, somente em runner público padrão.

## Posição operacional

**Site publicado:** https://lakehouse-zero-bronze-silver-gold-sw3bdd.v2.appdeploy.ai/

**Databricks:** não conectado, não provisionado, não homologado. A configuração do bundle é apenas template e não autoriza `bundle deploy` ou execução paga. A Free Edition futura depende de admissão, licença/limites vigentes e ação humana quando necessária.

**Testes locais:** 6/6 contratos do pacote canônico aprovados em sandbox Python + SQLite em 10/11/2026. Não comprovam Spark/Delta/Databricks.

**Custo adicional:** R$ 0,00. Sem Docker, sem cartão, sem nuvem paga, sem credenciais ou dados pessoais. O site e o pipeline não estão integrados automaticamente.

## Portas de validação

1. Preflight de custo, ambiente, regras e permissões; sem essa evidência, bloquear.
2. Ingestão Bronze, Silver, Gold, validação da qualidade, resultado e readback reais.
3. Testes positivo, negativo, colisão de payload e replay idempotente no ambiente admitido.
4. Checkpoint externo durável, hash, validação independente, CI do SHA atual e readback.
5. Issue/TODO canônico, revisão e autorização de integração. Sem merge implícito.

## Proveniência

- Issue: [#1](https://github.com/ericson-j-santos/Introducao_Data_Science_Python/issues/1).
- Base Git original: `main@3aed91820b2633a0518ef1277863351c2932b8e7`.
- Regras: `chatgpt-operational-rules` v1.6.21, SHA `58dcd4200f412a866278027ba9e433439a03f3b3`.
- ZIP canônico em Drive `ChatGPT - Artefatos/Lakehouse Zero CAS 2026-11-10/fluxo_medallion_zero.zip`, SHA-256 `5e9920fe5c6c23b6e7e61415d48415ddebd494552894a815066c3ccbf9051a48`. Conteúdo verificado por readback integral.
- 11 arquivos do pacote canônico tiveram Git blob SHA idêntico ao ZIP. 10 arquivos do site coincidiram integralmente com o snapshot AppDeploy.
- `correlation_id`: `chat-lakehouse-zero-20261110`. `idempotency_key`: `lakehouse-zero-source-mirror-v1`.

**Estado:** código espelhado em branch; a homologação do Databricks e os gates completos de PR/merge permanecem pendentes.
