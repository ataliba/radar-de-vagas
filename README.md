# Busca de vagas Tabajara

Radar de vagas remotas DevOps/SRE/Cloud/Infra em três plataformas (Gupy, InHire e Sólides),
com dashboard próprio pra acompanhar o que é novo, o que já foi enviado e onde as empresas
da sua lista têm página de carreiras.

Dois projetos, um repo, orquestrados pelo `docker-compose.yml` na raiz:

| Pasta | O que é |
|---|---|
| [`busca-vagas-gupy-inhire/`](busca-vagas-gupy-inhire/) | Pipeline que descobre vagas remotas na Gupy, InHire e Sólides. Roda sozinho em container, escreve os JSON num volume compartilhado. Trazido pra cá via `git subtree` — histórico preservado, [projeto original](https://github.com/vonrondow/busca-vagas-gupy-inhire) intacto. |
| [`rails/`](rails/) | Dashboard Rails que lê o resultado do pipeline, mostra vagas/presença/empresas e integra com o [JobSync](https://github.com/Gsync/jobsync). |

Ver [CHANGELOG.md](CHANGELOG.md) e as [releases](../../releases) pro histórico de versões.

## Rodar tudo

```
docker compose up
```

Sobe banco (Postgres), o scraper (roda no boot e depois no cron 8h/12h/18h) e o dashboard em
`http://localhost:3000`. Detalhes de cada parte nos READMEs das respectivas pastas.

## Atualizar o scraper a partir do projeto original

Como o `busca-vagas-gupy-inhire/` entrou via `git subtree`, dá pra puxar mudanças novas do
repo original sem perder histórico:

```
git subtree pull --prefix=busca-vagas-gupy-inhire https://github.com/vonrondow/busca-vagas-gupy-inhire.git main
```
