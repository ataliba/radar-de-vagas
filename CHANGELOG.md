# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [0.2.0] - 2026-08-11

### Adicionado
- Sólides como terceira fonte de vagas: scraper próprio (`solides.js`) consultando a API `portal-vacancies-new`, com match de cargo/remoto/empresa igual Gupy e InHire.
- Coluna Sólides na tela de presença por empresa (`/presencas`), com contagem de vagas no pool.
- Cor própria pra plataforma Sólides na tabela de vagas.

## [0.1.0] - 2026-07-20 a 2026-08-08

### Adicionado
- Pipeline inicial de busca de vagas remotas em Gupy e InHire.
- Dashboard Rails com integração JobSync e scraper containerizado (sem depender de Excel/COM no Windows).
- Tabela `empresa_alvos` com seed da lista de empresas.
- Tela "empresas cadastradas" ligando o cadastro web ao pipeline do scraper.
- Basic Auth no dashboard inteiro.
- Deploy via imagem pronta (`build.sh` + `docker-compose.prod.yml`).
- Status "não aplicável" pra vagas sem fit com o perfil, com badges coloridos por status (detectado/enviada/não aplicável).
- Escopo de cargo trocado de Dados/BI/Growth para DevOps/SRE/Cloud/Infra, com match ampliado de Cloud/Nuvem.
- Cron do scraper ajustado pra rodar às 8h/12h/18h.

### Alterado
- Repositório reestruturado em dois projetos irmãos: `rails/` e `busca-vagas-gupy-inhire/` (histórico do scraper preservado via git subtree).
