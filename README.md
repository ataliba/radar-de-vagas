# Radar de vagas

Dois projetos, um repo, orquestrados pelo `docker-compose.yml` na raiz:

| Pasta | O que é |
|---|---|
| [`busca-vagas-gupy-inhire/`](busca-vagas-gupy-inhire/) | Pipeline que descobre vagas remotas na Gupy e InHire. Roda sozinho em container, escreve os JSON num volume compartilhado. Trazido pra cá via `git subtree` — histórico preservado, [projeto original](https://github.com/vonrondow/busca-vagas-gupy-inhire) intacto. |
| [`rails/`](rails/) | Dashboard Rails que lê o resultado do pipeline, mostra vagas/presença/empresas e integra com o [JobSync](https://github.com/Gsync/jobsync). |

## Rodar tudo

```
docker compose up
```

Sobe banco (Postgres), o scraper (roda no boot e depois no cron 11h30/18h) e o dashboard em
`http://localhost:3000`. Detalhes de cada parte nos READMEs das respectivas pastas.

## Atualizar o scraper a partir do projeto original

Como o `busca-vagas-gupy-inhire/` entrou via `git subtree`, dá pra puxar mudanças novas do
repo original sem perder histórico:

```
git subtree pull --prefix=busca-vagas-gupy-inhire https://github.com/vonrondow/busca-vagas-gupy-inhire.git main
```
