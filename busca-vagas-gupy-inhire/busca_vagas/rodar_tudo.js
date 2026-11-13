#!/usr/bin/env node
// Porta Node de rodar_tudo.ps1 — mesmos passos 1-9 (sem o 10: geracao do
// .xlsx via Excel COM, que so roda no Windows e o Rails nao consome mesmo).
//
// Passos 1-3 (empresas + Gupy) migraram pra Python (radar_vagas/) — ver
// plano de migracao incremental por plataforma. Passos 4+ (InHire, Solides,
// merge, presence) continuam em Node ate cada modulo ser portado.
//
// Os passos sao agrupados por plataforma e uma falha nao interrompe as outras
// (ver GRUPOS abaixo).
const { execFileSync } = require("child_process");
const path = require("path");

const DIR = __dirname;

// Cada passo vira uma funcao que lanca em caso de falha (execFileSync lanca
// se o processo sai com codigo != 0).
//
// Timeout por passo: uma API que trava sem responder nao pode segurar o
// pipeline inteiro. Default em minutos via PASSO_TIMEOUT_MIN (30); passos
// sabidamente longos passam o proprio limite no 3o elemento em GRUPOS.
// Estourou -> SIGTERM no processo e o passo conta como falha do grupo.
const TIMEOUT_PADRAO_MIN = Number(process.env.PASSO_TIMEOUT_MIN) || 30;

const node = (arquivo) => (timeout) =>
  execFileSync("node", [path.join(DIR, arquivo)], { cwd: DIR, stdio: "inherit", timeout });

const python = (comando) => (timeout) =>
  // cwd = DIR (onde ficam companies.json etc.), mas o pacote radar_vagas/
  // mora um nivel acima em dev (irmao de busca_vagas/) e dentro do proprio
  // DIR em producao (entrypoint.sh copia os dois pra /data) — PYTHONPATH
  // cobre os dois casos.
  execFileSync("python3", ["-m", "radar_vagas.cli", comando], {
    cwd: DIR,
    stdio: "inherit",
    timeout,
    env: { ...process.env, RADAR_DATA_DIR: DIR, PYTHONPATH: path.join(DIR, "..") },
  });

// Grupos independentes: falha num passo pula so o resto do MESMO grupo (os
// passos de um grupo dependem dos anteriores). Os outros grupos rodam igual —
// uma plataforma fora do ar nao pode impedir as outras de coletar.
//
// Plataforma que falhou fica com os JSON da ultima coleta boa no volume, e a
// consolidacao usa esses (merge/presence aceitam arquivo ausente).
//
// `critico`: se falhar, o pipeline sai com codigo != 0 (nada novo pra importar).
const GRUPOS = [
  {
    nome: "Preparacao",
    passos: [
      ["[0] Buscar termos de busca -> termos.json", node("extrair_termos.js")],
      ["[1] Extrair empresas do xlsx -> companies.json", python("companies")],
    ],
  },
  {
    nome: "Gupy",
    passos: [
      ["[2] Gupy: buscar vagas (API global) + presenca pool", python("gupy-search")],
      ["[3] Gupy: presenca real por subdominio", python("gupy-presence")],
    ],
  },
  {
    nome: "InHire",
    passos: [
      ["[4] InHire: chute de slug a partir da lista", node("inhire.js")],
      ["[5] InHire: coletar slugs da web (Wayback/urlscan/CC)", node("harvest_inhire.js"), 60],
      ["[6] InHire: validar todos os slugs na API", node("validate_inhire.js")],
      ["[7] InHire: gerar saidas (vagas + empresas novas)", node("inhire_saida.js")],
    ],
  },
  {
    nome: "Solides",
    passos: [["[7b] Solides: buscar vagas (API portal-vacancies-new)", node("solides.js")]],
  },
  {
    nome: "Consolidacao",
    critico: true,
    passos: [
      ["[8] Consolidar e deduplicar vagas -> vagas_final.json", node("merge.js")],
      ["[8b] Carimbar data de deteccao (novas = hoje)", node("stamp_dates.js")],
      ["[9] Montar tabela de presenca", node("presence.js")],
    ],
  },
];

function rodarGrupo(grupo) {
  for (const [label, executar, timeoutMin = TIMEOUT_PADRAO_MIN] of grupo.passos) {
    console.log(`\n==== ${label} ====`);
    try {
      executar(timeoutMin * 60_000);
    } catch (err) {
      const motivo =
        err.code === "ETIMEDOUT" ? `timeout de ${timeoutMin} min`
        : err.status != null ? `saiu com codigo ${err.status}`
        : err.signal ? `morto por ${err.signal}`
        : err.message;
      console.error(`\n!!!! ${label} FALHOU (${motivo}) — pulando o resto do grupo ${grupo.nome}`);
      return { grupo: grupo.nome, passo: label, motivo, critico: !!grupo.critico };
    }
  }
  return null;
}

const t0 = Date.now();
const falhas = GRUPOS.map(rodarGrupo).filter(Boolean);
const mins = ((Date.now() - t0) / 60000).toFixed(1);

if (falhas.length === 0) {
  console.log(`\n==== CONCLUIDO em ${mins} min ====`);
} else {
  console.log(`\n==== CONCLUIDO COM FALHAS em ${mins} min ====`);
  for (const f of falhas) console.log(`  - ${f.grupo}: ${f.passo} (${f.motivo})`);
  console.log("  Grupos com falha ficaram com o resultado da ultima coleta boa.");
}

// Falha parcial sai com 0: o entrypoint roda com `set -e`, e codigo != 0
// impediria o aviso ao Rails (e derrubaria o container na subida) mesmo com
// as outras plataformas tendo coletado normalmente.
if (falhas.some((f) => f.critico)) process.exit(1);
