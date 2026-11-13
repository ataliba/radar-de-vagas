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


## Instalação rápida

Pré-requisito: uma máquina (Linux, macOS ou Windows com WSL2) com
[Docker](https://docs.docker.com/engine/install/) e o plugin `docker compose`. Não precisa
de Ruby, Python nem Postgres instalados: as imagens já vêm prontas do Docker Hub.

**1. Baixe o compose e o modelo de configuração**

```bash
mkdir radar-de-vagas && cd radar-de-vagas
curl -fsSLO https://raw.githubusercontent.com/ataliba/radar-de-vagas/main/docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/ataliba/radar-de-vagas/main/.env.example -o .env
```

(Ou `git clone` do repo e `cp .env.example .env`, dá no mesmo.)

**2. Preencha o `.env`**

O mínimo pra subir são duas variáveis:

```bash
# chave de sessão do Rails, qualquer valor aleatório e longo
sed -i "s/^SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$(openssl rand -hex 64)/" .env
# senha do Postgres interno
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 16)/" .env
```

Vai expor o dashboard fora da sua máquina? Preencha também `BASIC_AUTH_USER` e
`BASIC_AUTH_PASSWORD` (vazios = sem login). `JOBSYNC_URL`/`JOBSYNC_TOKEN` são opcionais, só
pra quem usa o [JobSync](https://github.com/Gsync/jobsync).

**3. Suba**

```bash
docker compose up -d
docker compose ps          # db, scraper e web devem aparecer "running"/"healthy"
```

Abra `http://localhost:3000` (ou `http://IP-DA-MAQUINA:3000`). O scraper roda uma vez no
boot e depois às 8h, 12h e 18h; a primeira leva de vagas aparece em alguns minutos.

**Dia a dia**

```bash
docker compose logs -f scraper web   # acompanhar o que tá rolando
docker compose pull && docker compose up -d   # atualizar pra última versão
docker compose down                  # parar (dados ficam nos volumes)
```

Pra fixar uma versão em vez de `latest`: `TAG=0.3.3 docker compose up -d` (ou `TAG=` no
`.env`). Usa Portainer? Veja o `docker-compose-portainer.yml` na tabela abaixo.

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
