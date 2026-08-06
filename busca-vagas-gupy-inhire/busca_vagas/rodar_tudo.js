#!/usr/bin/env node
// Porta Node de rodar_tudo.ps1 — mesmos passos 1-9 (sem o 10: geracao do
// .xlsx via Excel COM, que so roda no Windows e o Rails nao consome mesmo).
const { execFileSync } = require("child_process");
const path = require("path");

const DIR = __dirname;

function passo(label, arquivo) {
  console.log(`\n==== ${label} ====`);
  execFileSync("node", [path.join(DIR, arquivo)], { cwd: DIR, stdio: "inherit" });
}

const t0 = Date.now();

passo("[1] Extrair empresas do xlsx -> companies.json", "extrair_empresas.js");
passo("[2] Gupy: buscar vagas (API global) + presenca pool", "gupy.js");
passo("[3] Gupy: presenca real por subdominio", "gupy_presence_full.js");
passo("[4] InHire: chute de slug a partir da lista", "inhire.js");
passo("[5] InHire: coletar slugs da web (Wayback/urlscan/CC)", "harvest_inhire.js");
passo("[6] InHire: validar todos os slugs na API", "validate_inhire.js");
passo("[7] InHire: gerar saidas (vagas + empresas novas)", "inhire_saida.js");
passo("[8] Consolidar e deduplicar vagas -> vagas_final.json", "merge.js");
passo("[8b] Carimbar data de deteccao (novas = hoje)", "stamp_dates.js");
passo("[9] Montar tabela de presenca", "presence.js");

const mins = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\n==== CONCLUIDO em ${mins} min ====`);
