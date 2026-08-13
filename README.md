# Radar de vagas

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/0377e9d6-04c3-4f86-94f9-40ddd31d643e" />


Radar de vagas remotas DevOps/SRE/Cloud/Infra em três plataformas (Gupy, InHire e Sólides),
com dashboard próprio pra acompanhar o que é novo, o que já foi enviado e onde as empresas
da sua lista têm página de carreiras.

Dois projetos, um repo, orquestrados por docker compose na raiz:

| Pasta | O que é |
|---|---|
| [`busca-vagas-gupy-inhire/`](busca-vagas-gupy-inhire/) | Pipeline que descobre vagas remotas na Gupy, InHire e Sólides. Roda sozinho em container, escreve os JSON num volume compartilhado. Trazido pra cá via `git subtree` — histórico preservado, [projeto original](https://github.com/vonrondow/busca-vagas-gupy-inhire) intacto. |
| [`rails/`](rails/) | Dashboard Rails que lê o resultado do pipeline, mostra vagas/presença/empresas e integra com o [JobSync](https://github.com/Gsync/jobsync). |

Ver [CHANGELOG.md](CHANGELOG.md) e as [releases](../../releases) pro histórico de versões.


<img width="1280" height="644" alt="image" src="https://github.com/user-attachments/assets/9c36716c-34e0-4312-803e-bbeb18f1196f" />


## Qual docker-compose usar

| Arquivo | Quando usar |
|---|---|
| [`docker-compose.yml`](docker-compose.yml) | Deploy padrão — imagens prontas do Docker Hub (`cybernetus/radar-de-vagas-{web,scraper}`), sem build local. Inclui Postgres interno, 100% copy-paste. `docker compose up -d`, com `.env` no host (copie de [`.env.example`](.env.example)). |
| [`docker-compose-portainer.yml`](docker-compose-portainer.yml) | Cole direto em Portainer → Stacks → Add stack. Inclui Postgres interno (100% copy-paste, sem banco externo pra provisionar antes). Não depende de `.env` em disco (Portainer não lê); preencha as variáveis na seção "Environment variables" do editor. |
| [`docker-compose-dev.yml`](docker-compose-dev.yml) | Desenvolvimento — builda as imagens localmente a partir do source, hot reload. `docker compose -f docker-compose-dev.yml up`. |

Sobe banco (Postgres, só no dev), o scraper (roda no boot e depois no cron 8h/12h/18h) e o
dashboard em `http://localhost:3000`. Detalhes de cada parte nos READMEs das respectivas pastas.

## Atualizar o scraper a partir do projeto original

Como o `busca-vagas-gupy-inhire/` entrou via `git subtree`, dá pra puxar mudanças novas do
repo original sem perder histórico:

```
git subtree pull --prefix=busca-vagas-gupy-inhire https://github.com/vonrondow/busca-vagas-gupy-inhire.git main
```

## Créditos

O pipeline de busca (Gupy + InHire, depois estendido com Sólides) nasceu no
[vonrondow/busca-vagas-gupy-inhire](https://github.com/vonrondow/busca-vagas-gupy-inhire).
Trazido pra este repo via `git subtree`, com o histórico original preservado. O dashboard
Rails, a integração com JobSync e o scraper de Sólides foram construídos em cima disso.
