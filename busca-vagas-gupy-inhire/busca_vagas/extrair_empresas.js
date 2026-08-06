#!/usr/bin/env node
// Fonte da lista de empresas-alvo: prioriza o Rails (tela "Empresas
// cadastradas" do dashboard, editável via web) e só cai pro empresas.xlsx
// embutido na imagem se o Rails estiver fora do ar (ex.: primeira subida,
// antes do container do dashboard estar de pé). O xlsx via sharedStrings.xml
// (zip) é a porta Node do extrair_empresas.ps1 original — não usa COM do
// Excel, então roda em container Linux.
// Uso: node extrair_empresas.js [caminho_do_xlsx]
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const RAILS_EMPRESAS_URL = process.env.RAILS_EMPRESAS_URL || "http://web:3000/empresas_alvos.json";

async function buscarDoRails() {
  const resposta = await fetch(RAILS_EMPRESAS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

  const nomes = await resposta.json();
  if (!Array.isArray(nomes) || nomes.length === 0) throw new Error("lista vazia");

  return nomes;
}

function extrairDoXlsx(xlsxPath) {
  const xml = execFileSync("unzip", ["-p", xlsxPath, "xl/sharedStrings.xml"], {
    maxBuffer: 1024 * 1024 * 50,
  }).toString("utf8");

  const names = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const tMatches = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
    if (tMatches.length === 0) continue;
    const text = tMatches
      .map((t) => t[1])
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    if (text) names.push(text);
  }

  return names.filter((n) => n && n !== "Empresas");
}

(async () => {
  let nomes;

  try {
    nomes = await buscarDoRails();
    console.log(`companies.json a partir do Rails (${RAILS_EMPRESAS_URL}): ${nomes.length} empresas`);
  } catch (e) {
    console.log(`Rails indisponível (${e.message}) — usando empresas.xlsx como fallback`);
    const xlsxPath = process.argv[2] || path.join(DIR, "empresas.xlsx");
    nomes = extrairDoXlsx(xlsxPath);
    console.log(`companies.json a partir do xlsx: ${nomes.length} empresas`);
  }

  fs.writeFileSync(path.join(DIR, "companies.json"), JSON.stringify(nomes, null, 2));
})();
