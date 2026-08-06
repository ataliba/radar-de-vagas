// Shared helpers
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function loadCompanies() {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'companies.json'), 'utf8').replace(/^﻿/, ''));
  return raw.map(s => String(s).trim()).filter(Boolean);
}

// normalize: lowercase, strip accents, keep only a-z0-9 (compact)
function compact(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '');
}
// tokens (words) normalized, dropping generic corporate tokens
const STOP = new Set(['sa','s','a','ltda','me','eireli','group','grupo','the','company','co','tecnologia','tech','brasil','brazil','do','de','da','dos','das','and','solutions','software','digital','inc','holding','participacoes','banco']);
function tokens(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/).filter(t => t && !STOP.has(t));
}

// Role matching against a job title. Returns canonical role label or null.
function matchRole(title) {
  const t = ' ' + String(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  const has = (re) => re.test(t);
  if (has(/ revenue operations /) || has(/ revops /) || has(/ revenue ops /)) return 'Revenue Operations / RevOps';
  if (has(/ growth /)) return 'Growth Analyst / Analista de Growth';
  if (has(/ analista de insights /) || has(/ insights analyst /) || (has(/ insights /) && has(/ analista /))) return 'Analista de Insights';
  if (has(/ inteligencia de mercado /) || has(/ market intelligence /) || (has(/ intelligence /) && has(/ market /))) return 'Analista de Inteligência de Mercado';
  if (has(/ analista de negocios /) || has(/ business analyst /)) return 'Business Analyst / Analista de Negócios';
  if (has(/ inteligencia de negocios /) || has(/ analista de bi /) || has(/ bi analyst /) || has(/ business intelligence /) || has(/ analista de business intelligence /) || has(/ analista bi /)) return 'BI / Business Intelligence';
  if (has(/ analista de dados /) || has(/ data analyst /) || has(/ analista de dados e /)) return 'Analista de Dados / Data Analyst';
  return null;
}

// URL slug from a job title (lowercase, strip accents, non-alnum -> hyphen).
// The InHire SPA route is /vagas/:jobId/:slug — without the :slug segment the
// client router fails to resolve and renders a black screen. The slug is cosmetic
// (job loads by jobId), so any non-empty slug works.
function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'vaga';
}

function isRemote(workplaceType, isRemoteWork) {
  const w = String(workplaceType || '').toLowerCase();
  if (isRemoteWork === true) return true;
  return w.includes('remote') || w.includes('remoto');
}

// simple concurrency pool
async function pool(items, worker, concurrency = 12) {
  const results = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      try { results[idx] = await worker(items[idx], idx); }
      catch (e) { results[idx] = { __error: String(e && e.message || e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { DIR, loadCompanies, compact, tokens, matchRole, slugify, isRemote, pool, sleep, STOP };
