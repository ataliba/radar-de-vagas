#!/usr/bin/env node
// Porta Node de rodar_tudo.ps1 — mesmos passos 1-9 (sem o 10: geracao do
// .xlsx via Excel COM, que so roda no Windows e o Rails nao consome mesmo).
//
// Passos 1-3 (empresas + Gupy) migraram pra Python (radar_vagas/) — ver
// plano de migracao incremental por plataforma. Passos 4+ (InHire, Solides,
// merge, presence) continuam em Node ate cada modulo ser portado.
const { execFileSync } = require("child_process");
const path = require("path");

const DIR = __dirname;

function passo(label, arquivo) {
  console.log(`\n==== ${label} ====`);
  execFileSync("node", [path.join(DIR, arquivo)], { cwd: DIR, stdio: "inherit" });
}

function passoPython(label, comando) {
  console.log(`\n==== ${label} ====`);
  // cwd = DIR (onde ficam companies.json etc.), mas o pacote radar_vagas/
  // mora um nivel acima em dev (irmao de busca_vagas/) e dentro do proprio
  // DIR em producao (entrypoint.sh copia os dois pra /data) — PYTHONPATH
  // cobre os dois casos.
  execFileSync("python3", ["-m", "radar_vagas.cli", comando], {
    cwd: DIR,
    stdio: "inherit",
    env: { ...process.env, RADAR_DATA_DIR: DIR, PYTHONPATH: path.join(DIR, "..") },
  });
}

const t0 = Date.now();

passo("[0] Buscar termos de busca -> termos.json", "extrair_termos.js");
passoPython("[1] Extrair empresas do xlsx -> companies.json", "companies");
passoPython("[2] Gupy: buscar vagas (API global) + presenca pool", "gupy-search");
passoPython("[3] Gupy: presenca real por subdominio", "gupy-presence");
passo("[4] InHire: chute de slug a partir da lista", "inhire.js");
passo("[5] InHire: coletar slugs da web (Wayback/urlscan/CC)", "harvest_inhire.js");
passo("[6] InHire: validar todos os slugs na API", "validate_inhire.js");
passo("[7] InHire: gerar saidas (vagas + empresas novas)", "inhire_saida.js");
passo("[7b] Solides: buscar vagas (API portal-vacancies-new)", "solides.js");
passo("[8] Consolidar e deduplicar vagas -> vagas_final.json", "merge.js");
passo("[8b] Carimbar data de deteccao (novas = hoje)", "stamp_dates.js");
passo("[9] Montar tabela de presenca", "presence.js");

const mins = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\n==== CONCLUIDO em ${mins} min ====`);
