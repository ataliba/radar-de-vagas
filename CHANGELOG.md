# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [0.3.0] - 2026-08-13

### Adicionado
- Tela "termos de busca" no dashboard (`/termos_busca`), pra tornar o radar agnóstico de área: escolha entre 2 presets prontos — DevOps/SRE/Cloud/Infra (o escopo atual) e Dados/BI/Growth (o escopo original do projeto, recuperado de antes do commit `a519a6b`) — mais um campo livre de termos customizados separados por vírgula. Config gravada na tabela `termos_busca`, única fonte pros dois consumidores do scraper (`QUERIES` de busca na API e `matchRole` de classificação de título), evitando dessincronia entre os dois. ([#9](https://github.com/ataliba/radar-de-vagas/issues/9))

### Alterado
- Scraper Node: `matchRole` fixo virou `buildMatchRole(termos)`, um builder que lê `termos.json` (buscado do Rails via `extrair_termos.js`, novo passo `[0]` do pipeline, com fallback pro preset DevOps embutido se o Rails estiver fora do ar) — `gupy.js`/`solides.js` também passam a montar `QUERIES` a partir dessa mesma lista, no lugar do array hardcoded.
- `/vagas`: filtro de categoria (`@cargo_categorias`) passa a refletir os rótulos de fato gravados no banco, no lugar da constante fixa `Vaga::CARGO_CATEGORIAS` (removida) — necessário pro filtro funcionar com o preset Dados/BI/Growth também.

## [0.2.4] - 2026-08-13

### Corrigido
- Dedup de vagas Sólides: o link embute um slug derivado do título (cosmético), que muda se a empresa editar o título — o dedup por link sozinho gerava linha duplicada pra mesma vaga. Adiciona `id_externo` (id puro da Sólides) como chave de dedup, com índice único parcial no banco.

### Adicionado
- `bin/rails vagas:fix_solides_links` — rake task pra corrigir links Sólides gravados antes da 0.2.3 (subdomínio `.solides.jobs` ou `/vagas/:id` sem slug) e fazer backfill do `id_externo` nas linhas existentes. Rodada contra a base de produção: 38 links corrigidos, 30 duplicatas removidas.

## [0.2.3] - 2026-08-12

### Corrigido
- URL das vagas Sólides ainda quebrada mesmo após o fix da 0.2.1: rota `vagas.solides.com.br/vagas/<id>` (plural, sem slug) cai numa página genérica sem os dados da vaga. Rota correta é singular, `/vaga/<id>/<slug>` — slug cosmético, gerado a partir do título via `slugify()` (mesmo padrão já usado no InHire). ([#8](https://github.com/ataliba/radar-de-vagas/issues/8))
- Deploy no Portainer falhando com `bin/rails: no such file or directory` — causa provável era `command:`/`working_dir:` residual copiado de outra stack. ([#7](https://github.com/ataliba/radar-de-vagas/issues/7))

### Alterado
- `docker-compose` separado por cenário: `docker-compose.yml` (deploy padrão, imagens do Docker Hub, era `docker-compose.prod.yml`), `docker-compose-dev.yml` (build local, era `docker-compose.yml`) e a nova `docker-compose-portainer.yml` (pra colar direto em Portainer → Stacks, sem depender de `.env` em disco).

## [0.2.1] - 2026-08-12

### Corrigido
- URL das vagas Sólides quebrada: `redirectLink` da API aponta pra subdomínio `<empresa>.solides.jobs` que não resolve pra maioria das empresas (DNS NXDOMAIN). Trocado pra `vagas.solides.com.br/vagas/<id>`, formato que abre de verdade.

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
