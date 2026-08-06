// Coleta slugs de tenants InHire da web aberta (Wayback + urlscan + Common Crawl).
// Gera: wb_app.txt, us_app_paged.json, cc_app.jsonl  (consumidos por validate_inhire.js)
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getText(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

async function wayback() {
  console.log('[wayback] baixando CDX *.inhire.app ...');
  try {
    const t = await getText('http://web.archive.org/cdx/search/cdx?url=*.inhire.app&output=text&fl=original&collapse=urlkey&limit=200000');
    fs.writeFileSync(path.join(DIR, 'wb_app.txt'), t);
    const hosts = new Set((t.match(/https?:\/\/[a-z0-9-]+\.inhire\.app/gi) || []).map(x => x.replace(/^https?:\/\//, '').toLowerCase()));
    console.log('[wayback] hosts unicos:', hosts.size);
  } catch (e) { console.log('[wayback] falhou:', e.message); }
}

async function urlscan() {
  console.log('[urlscan] paginando domain:inhire.app ...');
  const base = 'https://urlscan.io/api/v1/search/?q=domain:inhire.app&size=100';
  let after = '', all = [];
  try {
    for (let i = 0; i < 6; i++) {
      const url = base + (after ? '&search_after=' + after : '');
      const r = await fetch(url); const j = await r.json();
      const res = j.results || []; all = all.concat(res);
      if (res.length < 100) break;
      after = (res[res.length - 1].sort || []).join(',');
      await sleep(1500);
    }
  } catch (e) { console.log('[urlscan] parou:', e.message); }
  fs.writeFileSync(path.join(DIR, 'us_app_paged.json'), JSON.stringify({ results: all }));
  console.log('[urlscan] resultados:', all.length);
}

async function commonCrawl(nIndexes = 12) {
  console.log('[commoncrawl] descobrindo indices ...');
  let indexes = [];
  try {
    const info = JSON.parse(await getText('https://index.commoncrawl.org/collinfo.json'));
    indexes = info.slice(0, nIndexes).map(x => x.id);
  } catch (e) { console.log('[commoncrawl] collinfo falhou:', e.message); return; }
  const out = fs.createWriteStream(path.join(DIR, 'cc_app.jsonl'));
  let lines = 0;
  for (const idx of indexes) {
    try {
      const t = await getText(`https://index.commoncrawl.org/${idx}-index?url=*.inhire.app&output=json&fl=url`);
      out.write(t.endsWith('\n') ? t : t + '\n');
      lines += t.split(/\n/).filter(Boolean).length;
      process.stdout.write(`  [commoncrawl] ${idx} ok (acumulado ${lines})\n`);
    } catch (e) { process.stdout.write(`  [commoncrawl] ${idx} vazio/erro\n`); }
    await sleep(300);
  }
  out.end();
}

(async () => {
  await wayback();
  await urlscan();
  await commonCrawl(12);
  console.log('[harvest] concluido -> wb_app.txt, us_app_paged.json, cc_app.jsonl');
})();
