const fs = require('fs');
const path = require('path');
const { DIR, loadCompanies, compact, tokens, sleep, pool } = require('./lib.js');

function slugVariants(name) {
  const allToks = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const toks = tokens(name);
  const set = new Set();
  const add = v => { if (v && v.length >= 2 && v.length <= 40) set.add(v); };
  add(compact(name)); add(allToks.join('')); add(toks.join(''));
  add(allToks.join('-')); add(toks.join('-'));
  if (toks[0]) add(toks[0]);
  if (allToks[0]) add(allToks[0]);
  return [...set];
}
function titleMatches(company, title) {
  const a = new Set(tokens(company)), b = new Set(tokens(title));
  for (const t of a) if (b.has(t) && t.length >= 3) return true;
  const ca = compact(company), cb = compact(title);
  return (ca.length >= 4 && cb.includes(ca)) || (cb.length >= 4 && ca.includes(cb));
}
async function probe(slug) {
  try {
    const res = await fetch(`https://${slug}.gupy.io/`, { redirect: 'follow' });
    if (res.status !== 200) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    const title = m ? m[1].trim() : '';
    if (!title || /^404$/.test(title)) return null;
    return title;
  } catch { return null; }
}

(async () => {
  const companies = loadCompanies();
  const found = [];
  let checked = 0;
  await pool(companies, async (company) => {
    for (const slug of slugVariants(company)) {
      const title = await probe(slug);
      if (title && titleMatches(company, title)) {
        found.push({ empresa: company, titulo_gupy: title, url: `https://${slug}.gupy.io/` });
        break;
      }
    }
    checked++;
    if (checked % 150 === 0) process.stdout.write(`  [gupy-presence] ${checked}/${companies.length}, found ${found.length}\n`);
  }, 16);
  found.sort((a,b)=>a.empresa.localeCompare(b.empresa));
  fs.writeFileSync(path.join(DIR, 'gupy_presence_full.json'), JSON.stringify(found, null, 2));
  console.log(`[gupy-presence] companies with a Gupy career page: ${found.length}/${companies.length}`);
})();
