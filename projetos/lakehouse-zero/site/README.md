# Site Lakehouse Zero

Fonte React + Vite publicada em https://lakehouse-zero-bronze-silver-gold-sw3bdd.v2.appdeploy.ai/

Este diretório replica exatamente o snapshot AppDeploy `1794271535460` (10 arquivos do projeto, excluindo este README). O código publicado no AppDeploy não é atualizado automaticamente por commits neste repositório.

O site é apenas um painel de planejamento: registros locais no navegador, exportação/importação de checkpoints com SHA-256, bloqueios documentados. Não possui backend, conexão Databricks, autenticação ou gravação de evidências no TODO Global.

## Desenvolvimento em ambiente autorizado

Pré-requisito Node.js compatível com o scaffold. Instalação/build requerem ambiente previamente admitido sob as regras canônicas; **não** executar em host bloqueado. O projeto é Vite/React e contém `package.json`, sem lockfile no snapshot remoto. Reprodutibilidade exata de dependências ainda deve ser validada antes de PR de integração.

A publicação inicial AppDeploy está verificada separadamente. Espelhamento GitHub não é deploy e não altera a URL ativa.

## Segurança

Sem credenciais, custos incrementais, Docker ou provisionamento. Dados exibidos são sintéticos; não inserir dados pessoais no armazenamento do navegador.
