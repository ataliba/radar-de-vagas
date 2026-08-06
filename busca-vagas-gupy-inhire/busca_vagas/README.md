# Busca de vagas — Gupy + InHire

Pipeline que encontra **vagas remotas** nos cargos de dados/BI/negócios/growth nas duas
plataformas e gera uma planilha Excel pronta para candidatura. A busca é **global** (todas as
empresas com vaga aberta no cargo-alvo); a sua lista de empresas serve para **marcar** o que é
dela (coluna "Na sua lista?") e montar a aba de Presença — não corta mais as de fora.

Última execução: **16/07/2026** → **89 vagas (53 Gupy + 36 InHire)** + 251 empresas com presença
+ 289 empresas InHire descobertas fora da lista. Roda em ~3 min.

---

## Como rodar de novo (o jeito rápido)

1. (Opcional) Atualize a lista de empresas em
   `..\empresas.xlsx` — uma empresa por linha, na primeira coluna.
2. Abra o **PowerShell** nesta pasta e rode:

   ```powershell
   powershell -ExecutionPolicy Bypass -File rodar_tudo.ps1
   ```

3. Ao final, abra a planilha gerada: **`..\vagas_gupy_inhire.xlsx`**

O processo leva ~3–10 min (a maior parte é rede: buscar e validar tenants InHire).

> ⚠️ **FECHE o `vagas_gupy_inhire.xlsx` no Excel antes de rodar.** Se estiver aberto, o
> arquivo fica travado e a última etapa falha. O `build_xlsx.ps1` agora avisa cedo se
> detectar o lock (`~$vagas_gupy_inhire.xlsx`) em vez de deixar um Excel órfão pendurado.

### Pré-requisitos
- **Node.js** (testado no v24) no PATH — https://nodejs.org
- **Microsoft Excel** instalado (a planilha é gerada via automação COM do Excel)
- Conexão à internet

---

## O que sai (a planilha, 3 abas)

| Aba | Conteúdo |
|-----|----------|
| **Vagas** | Vagas remotas nos cargos-alvo (das DUAS plataformas). Coluna **"Na sua lista?"** separa o que é da sua lista (Sim) do que foi descoberto fora dela (Não) — vale para Gupy **e** InHire. Coluna **Alerta** sinaliza título com "híbrido/presencial" ou local fora do BR (pode exigir inglês). Coluna **"Detectada em"** = data em que a vaga apareceu pela 1ª vez no pipeline (filtre pela data de hoje para ver o que é novo). Link clicável para candidatar. |
| **Presença por Empresa** | Quais empresas da sua lista têm página na Gupy e/ou InHire, com links de carreiras. |
| **InHire novas (fora da lista)** | Empresas InHire com vaga aberta que **não** estão na sua lista, ordenadas por volume. Mapa para explorar além dos seus cargos. |

---

## Como o pipeline funciona (e o que descobri)

As duas plataformas são ATS (cada empresa tem sua própria página de carreiras). Não existe
lista pública de clientes. A sacada foi usar as **APIs públicas** direto (curl/fetch), não
scraping de página — WebFetch dá 403/SPA, mas as APIs JSON respondem.

### Gupy — tem busca global
- API: `GET https://employability-portal.gupy.io/api/v1/jobs?jobName=<cargo>&offset=<n>&limit=100`
- Campos: `careerPageName` (empresa), `name` (título), `workplaceType` (`remote`/`hybrid`/`on-site`), `jobUrl`.
- **Cuidado:** `pagination.total` é bugado (trava em 100 quando `limit>=100`). Pagino por offset até uma página vir com menos de 100 linhas. `limit=1000` é rejeitado.
- Presença real por empresa: `https://<slug>.gupy.io/` → 200 + `<title>Empresa</title>` se existe; 404 se não.

### InHire — NÃO tem busca global (é por empresa/"tenant")
- API: `GET https://api.inhire.app/job-posts/public/pages` com header `X-Tenant: <slug>`.
  - Tenant real → objeto `{tenantName, jobsPage:[{displayName, workplaceType (Remote/Hybrid/On-site), location, jobId, status}]}`
  - Tenant inexistente → `[]`. (É o "oráculo" que confirma se a empresa usa InHire.)
- Página pública da vaga: **`https://<slug>.inhire.app/vagas/<jobId>/<slug-do-titulo>`** (o `.com.br` NÃO resolve). **O segmento do slug do título é obrigatório:** a rota do SPA é `/vagas/:jobId/:slug`; sem o `:slug` a página fica TELA PRETA (o servidor sempre devolve 200 com a mesma casca — o roteamento é client-side). O slug é cosmético (a vaga carrega pelo `jobId`), então `slugify(displayName)` resolve — a API não expõe o slug real.
- **Achar todos os tenants:** Certificate Transparency e passive DNS **não** funcionam (wildcard
  `*.inhire.app`). O que funciona é colher slugs reais da web aberta e validar cada um na API:
  - **Wayback Machine (CDX)** — maior rendimento (~400 hosts)
  - **urlscan.io** (`domain:inhire.app`, paginado)
  - **Common Crawl** (vários índices)

### Casamento empresa ↔ tenant/careerPage
Normaliza acento/caixa e exige **token distintivo** (ignora genéricos: consultoria, saúde,
educação, tech, grupo…) ou compact-substring forte. Sem isso dá falso positivo
(ex.: "Lopes Consultoria" ↔ "BIX Consultoria de Dados").

---

## Ordem dos scripts (o que o rodar_tudo.ps1 chama)

| # | Script | Entrada → Saída |
|---|--------|-----------------|
| 1 | `extrair_empresas.ps1` | `empresas.xlsx` → `companies.json` |
| 2 | `gupy.js` | companies.json → `gupy_results.json`, `gupy_presence.json` |
| 3 | `gupy_presence_full.js` | companies.json → `gupy_presence_full.json` (presença por subdomínio) |
| 4 | `inhire.js` | companies.json → `inhire_tenants.json` (chute de slug pela lista) |
| 5 | `harvest_inhire.js` | web → `wb_app.txt`, `us_app_paged.json`, `cc_app.jsonl` |
| 6 | `validate_inhire.js` | slugs → `inhire_all_tenants.json`, `inhire_all_vagas.json` |
| 7 | `inhire_saida.js` | → `inhire_results.json`, `inhire_new_companies.json` |
| 8 | `merge.js` | gupy+inhire → `vagas_final.json` (dedup) |
| 8b | `stamp_dates.js` | mantém `seen.json` (data da 1ª aparição) → grava `detectado_em` em cada vaga |
| 9 | `presence.js` | → `presence_combined.json` |
| 10 | `build_xlsx.ps1` | tudo → `..\vagas_gupy_inhire.xlsx` |

`lib.js` = helpers compartilhados (normalização, casamento de cargo, `slugify` do título da vaga, pool de concorrência).
`seen.json` = histórico persistente `{ chave → data }` da 1ª vez que cada vaga foi vista (não apagar; é o que alimenta a coluna "Detectada em").

---

## Ajustar filtros (o que mexer)

- **Cargos aceitos:** função `matchRole()` em `lib.js`. Adicione padrões para incluir novos
  títulos (ex.: Product Analyst, Analytics Engineer, Performance, Pricing, CRM).
- **Termos de busca da Gupy:** array `QUERIES` no topo de `gupy.js`.
- **Só remoto vs incluir híbrido:** hoje filtra `workplaceType` remoto em `gupy.js`,
  `validate_inhire.js` e `merge.js`. Para incluir híbrido, afrouxe esses filtros (não recomendado:
  bate com o requisito de 100% remoto).
- **Escopo (Gupy e InHire = tudo, marcado):** desde 16/07/2026 a Gupy é **simétrica** à InHire —
  `gupy.js` NÃO filtra mais por lista; traz TODAS as vagas remotas nos cargos-alvo e marca
  `na_lista` (Sim/Não). O `matchCompany` só é usado para montar a aba **Presença**. Para voltar
  ao escopo "só minha lista", filtre `na_lista === 'Sim'` (ou reative o corte por `matchCompany`).
- **Excluir estágio/júnior/trainee:** hoje `matchRole()` casa pelo cargo e pode pegar um estágio
  ("Estágio em Growth"). Se quiser cortar, filtre o título por `estágio|júnior|jr|trainee` antes de
  gravar (em `gupy.js` e `validate_inhire.js`).

---

## Limitações honestas
- A descoberta InHire é **um piso, não um teto**: só acha tenants que já apareceram na web
  aberta ou que dão match de slug pela lista. Empresas com domínio de carreira próprio
  (custom domain) podem não aparecer.
- `workplaceType` às vezes vem mistagueado (título diz "híbrido" mas API diz remoto) → coluna Alerta.
- Local fora do BR pode exigir inglês → coluna Alerta.
- Os índices do Common Crawl e o cache do urlscan mudam com o tempo; o `harvest_inhire.js`
  pega os índices mais recentes dinamicamente.

## Rodar um script isolado
Da pasta, ex.: `node gupy.js` ou `powershell -File build_xlsx.ps1`.
