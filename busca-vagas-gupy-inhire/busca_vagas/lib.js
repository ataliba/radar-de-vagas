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

// same accent-strip + lowercase + non-alnum->space normalization matchRole
// always used, padded with spaces so substring checks respect word boundaries
function normalizeTitle(s) {
  return ' ' + String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
}

// Builds a title -> canonical role label matcher from a list of
// { termo, rotulo } (ver termos.json, gerado por extrair_termos.js a partir
// da config em TermoBusca no Rails). Termos mais longos (mais específicos)
// são checados primeiro, o que substitui a priorização manual que existia
// antes (Kubernetes antes de DevOps genérico, etc) sem precisar hardcodar a
// ordem.
function buildMatchRole(termos) {
  const sorted = termos
    .map(({ termo, rotulo }) => ({ termo: normalizeTitle(termo).trim(), rotulo }))
    .sort((a, b) => b.termo.length - a.termo.length);
  return (title) => {
    const t = normalizeTitle(title);
    const hit = sorted.find(({ termo }) => t.includes(` ${termo} `));
    return hit ? hit.rotulo : null;
  };
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

module.exports = { DIR, loadCompanies, compact, tokens, buildMatchRole, slugify, isRemote, pool, sleep, STOP };
