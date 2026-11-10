# Fluxo Bronze / Silver / Gold — protótipo Databricks de custo zero

**Estado:** código preparado para DEV; **NÃO** homologado em Databricks. Não cria recursos por conta própria, não executa agenda, não inclui produção, SQL Server nem Power BI.

## Arquitetura

- **Bronze**: 7 eventos sintéticos, Delta gerenciado em `catalogo_atual.default.<prefixo>_bronze`. MERGE por `id_evento` (não duplica em replay); rejeita colisões com payload diferente.
- **Silver**: última versão de cada pedido, `TRY_CAST`, validações e 2 tabelas Delta: `<prefixo>_silver` e `<prefixo>_rejeitados`. Se a última versão for inválida, ela é rejeitada, sem reativar uma anterior.
- **Gold**: total financeiro, quantidade de pedidos e unidades por data/categoria em `<prefixo>_gold`.
- **Validar**: releitura SQL das tabelas persistidas e asserts de 7 eventos, 3 pedidos válidos, 3 rejeitados, 3 grupos e total **80,00** (valor fictício).
- **Orquestração**: Lakeflow Job com `bronze → silver → gold → validar`, concorrência 1, sem `schedule`, `trigger`, cluster ou tarefa automática.

## Como testar sem conta Databricks

Na pasta extraída, com Python 3.10+ (biblioteca padrão):

```bash
python -m unittest discover -s tests -v
python -m src.demo_local --db saida/demo_medallion.sqlite
python -m src.demo_local --db saida/demo_medallion.sqlite
```

O ensaio local usa **SQLite, não Spark nem Delta**. Não apresente esses testes como E2E Databricks.

## Como executar futuramente na Free Edition (ação humana e gate de custo)

1. Acessar a [edição gratuita oficial](https://www.databricks.com/learn/free-edition). **Não** iniciar Free Trial, associar faturamento, criar workspace pago ou habilitar overage. Conferir no painel que é efetivamente Free Edition, sem cobrança, e que a cota está disponível.
2. Conferir `SELECT current_catalog()` e se o esquema `default` do catálogo atribuído permite `CREATE TABLE`. Isso usa tabelas gerenciadas; não precisa criar catálogo, cluster ou armazenamento externo.
3. Escolher um prefixo próprio único, por exemplo `demo_medallion_seuidentificador`. Compartilhamento/colisões de tabela não devem ser assumidos seguros.
4. Importar `notebooks/medallion.py` em **Workspace** e criar manualmente quatro tarefas Notebook com o mesmo arquivo no Lakeflow Jobs (parâmetro `etapa`: `bronze`, `silver`, `gold`, `validar`; `prefixo` idêntico para todas; dependências sequenciais). **Não agendar**. Alternativamente, depois de validar o ambiente, verificar `databricks bundle validate` no CLI oficial e revisar o plano antes de qualquer `bundle deploy` e `bundle run`. A configuração `databricks.yml` é um template não validado por CLI/Databricks nesta entrega.
5. Executar apenas manualmente e sob os limites confirmados do Free Edition. Se aparecer opção de cobrança, upgrade, Trial ou cluster pago, **parar**.
6. Registrar run_id, estado individual das quatro tarefas, saída `EVIDENCIA_MEDALLION`, versão do código e leitura **independente** no SQL Editor das quatro tabelas. Repetir a execução para demonstrar idempotência; verificar que Bronze permanece 7.

Consultas independentes (ajustar catálogo/prefixo):

```sql
SELECT COUNT(*) FROM <catalogo>.default.<prefixo>_bronze;
SELECT COUNT(*) FROM <catalogo>.default.<prefixo>_silver;
SELECT COUNT(*) FROM <catalogo>.default.<prefixo>_rejeitados;
SELECT SUM(valor_total) FROM <catalogo>.default.<prefixo>_gold;
```

## Critérios de aceite

| Gate | Critério | Estado da entrega |
|---|---|---|
| Custo | Sem pagamento, cluster ou execução remunerada | Design sem recursos provisionados; custo de futura conta deve ser revalidado |
| Sintaxe | Python e YAML parseáveis | Testar localmente |
| Testes de contrato | Positivo, negativo, última versão, colisão | Testar localmente |
| Replay | Duas execuções sem duplicação | Testar em SQLite; pendente em Delta |
| Orquestração | 4 tarefas, dependências, `max_concurrent_runs=1` | Definida em YAML; pendente no Databricks |
| Delta E2E | Tabelas reais, run_id e leitura independente | **BLOQUEADO** até conexão Free Edition autorizada |
| Produção/BI/SQL Server | Fora do escopo | Não aplicável |

## Riscos e limites

- A camada Bronze preserva os eventos, mas Silver e Gold são reconstruídas por `CREATE OR REPLACE TABLE` e **não** são incrementalizadas. A versão inicial só oferece ingestão idempotente na Bronze.
- Não existe transação única das quatro tarefas: falhas intermediárias deixam tabelas de estágios diferentes. Falha na validação impede o job de ser considerado aprovado; não é solução para produção.
- O exemplo usa um prefixo configurável dentro de `default`; executar em catálogo/esquema com permissões e prefixo próprios.
- Não há um mecanismo efetivo de limite financeiro configurado via código. A elegibilidade da Free Edition precisa ser comprovada no workspace no instante do uso.
- Os testes SQLite não validam tipos/semântica do `TRY_CAST`, SQL Spark ou Delta. O ambiente Databricks real é indispensável para fechar esse gate.

## Governança consultada

`chatgpt-operational-rules` v1.6.20, `main@86abe65b22781c2f608a7d7286ce3a28cd48aaaf` (consulta em 2026-11-09); regras de custo, validação, artefatos e TODO. Sem alteração de repositório remoto e sem solicitação de faturamento.
