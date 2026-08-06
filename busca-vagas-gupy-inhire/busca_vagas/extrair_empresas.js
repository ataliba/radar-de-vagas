#!/usr/bin/env node
// Porta Node de extrair_empresas.ps1 — le a coluna de empresas do .xlsx via
// sharedStrings.xml (zip) em vez de COM do Excel, pra rodar em container Linux.
// Uso: node extrair_empresas.js [caminho_do_xlsx]
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const xlsxPath = process.argv[2] || path.join(DIR, "empresas.xlsx");

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

const filtradas = names.filter((n) => n && n !== "Empresas");
fs.writeFileSync(path.join(DIR, "companies.json"), JSON.stringify(filtradas, null, 2));
console.log(`companies.json gerado com ${filtradas.length} empresas`);
