#!/usr/bin/env node
// Fonte dos termos de busca (QUERIES da Gupy/Sólides + rótulo de cargo
// exibido no dashboard): prioriza o Rails (tela "termos de busca", editável
// via web — preset DevOps/SRE/Cloud/Infra ou Dados/BI/Growth + termos
// customizados) e só cai pro preset DevOps embutido abaixo se o Rails
// estiver fora do ar (scraper continua funcionando standalone).
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const RAILS_TERMOS_URL = process.env.RAILS_TERMOS_URL || "http://web:3000/termos_busca.json";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER;
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;

// Preset DevOps/SRE/Cloud/Infra embutido — mesmo conteúdo de
// rails/db/seed_data/termos_devops.json, duplicado aqui de propósito pro
// scraper rodar sem depender do Rails estar de pé.
const FALLBACK_DEVOPS = [
  { termo: "DevOps", rotulo: "DevOps Engineer / SRE" },
  { termo: "SRE", rotulo: "DevOps Engineer / SRE" },
  { termo: "Site Reliability Engineer", rotulo: "DevOps Engineer / SRE" },
  { termo: "Cloud", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Cloud Engineer", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Cloud Security", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Analista Cloud", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Nuvem", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Platform Engineer", rotulo: "Cloud Engineer / Cloud Security / Platform Engineer" },
  { termo: "Kubernetes", rotulo: "Kubernetes Engineer" },
  { termo: "Infraestrutura", rotulo: "Infraestrutura / Sysadmin" },
  { termo: "Analista de Infraestrutura", rotulo: "Infraestrutura / Sysadmin" },
  { termo: "Sysadmin", rotulo: "Infraestrutura / Sysadmin" },
  { termo: "Administrador de Sistemas", rotulo: "Infraestrutura / Sysadmin" },
];

async function buscarDoRails() {
  const headers = {};
  if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64")}`;
  }

  const resposta = await fetch(RAILS_TERMOS_URL, { headers, signal: AbortSignal.timeout(10_000) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

  const termos = await resposta.json();
  if (!Array.isArray(termos) || termos.length === 0) throw new Error("lista vazia");

  return termos;
}

(async () => {
  let termos;

  try {
    termos = await buscarDoRails();
    console.log(`termos.json a partir do Rails (${RAILS_TERMOS_URL}): ${termos.length} termos`);
  } catch (e) {
    console.log(`Rails indisponível (${e.message}) — usando preset DevOps embutido como fallback`);
    termos = FALLBACK_DEVOPS;
    console.log(`termos.json a partir do fallback embutido: ${termos.length} termos`);
  }

  fs.writeFileSync(path.join(DIR, "termos.json"), JSON.stringify(termos, null, 2));
})();
