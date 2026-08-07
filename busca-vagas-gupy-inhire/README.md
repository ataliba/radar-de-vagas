# Busca de vagas — Gupy + InHire

Pipeline que descobre **vagas 100% remotas** em cargos de DevOps/SRE/Cloud/Infra nos dois
maiores ATS do mercado brasileiro e entrega uma planilha Excel pronta para candidatura.

A sacada: as duas plataformas expõem **APIs JSON públicas**. A Gupy tem busca global; a InHire
**não** — lá cada empresa é um *tenant* isolado, e não existe lista pública de clientes. O
pipeline reconstrói essa lista colhendo subdomínios reais da web aberta (Wayback CDX, urlscan,
Common Crawl) e validando cada slug contra a API — o que faz aparecer vaga que não está em
nenhum agregador.

**Última execução (20/07/2026):** 98 vagas remotas · 251 empresas mapeadas por presença ·
289 empresas InHire descobertas fora da lista inicial. Roda em ~4 min.

## Como rodar

```powershell
powershell -ExecutionPolicy Bypass -File busca_vagas\rodar_tudo.ps1
```

Requer **Node.js** no PATH e **Excel** instalado (a planilha é gerada via automação COM).
Feche o `vagas_gupy_inhire.xlsx` antes de rodar.

Documentação completa — arquitetura, os 10 passos do pipeline, os bugs de API descobertos e
como ajustar os filtros de cargo: **[`busca_vagas/README.md`](busca_vagas/README.md)**.

## Estrutura

| Caminho | O que é |
|---|---|
| `busca_vagas/*.js` | Coleta e validação (Gupy, InHire, harvest de tenants, merge, dedup) |
| `busca_vagas/*.ps1` | Orquestração, extração da lista de empresas e build da planilha |
| `busca_vagas/agendado_run.ps1` | Wrapper da Tarefa Agendada do Windows (roda 11h30 e 18h) |
| `empresas.xlsx` | Lista de empresas-alvo (entrada) |
| `vagas_gupy_inhire.xlsx` | Planilha final, 3 abas (saída) |

## Nota

Usa apenas endpoints públicos e não autenticados, com pool de concorrência limitado — os mesmos
dados que qualquer visitante vê nas páginas de carreiras. Nada de credencial, login ou dado de
candidato.
