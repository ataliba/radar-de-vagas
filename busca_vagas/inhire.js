const fs = require('fs');
const path = require('path');
const { DIR, loadCompanies, compact, tokens, matchRole, slugify, sleep, pool } = require('./lib.js');

const API = 'https://api.inhire.app/job-posts/public/pages';
const HEADERS_BASE = { 'X-Inhire-Client': 'web-inhire', 'Content-Type': 'application/json', 'Accept': 'application/json' };

// generate candidate tenant slugs for a company name
function slugVariants(name) {
  const toks = tokens(name);           // meaningful tokens, stopwords removed
  const allToks = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const set = new Set();
  const add = v => { if (v && v.length >= 2 && v.length <= 40) set.add(v); };
  add(compact(name));                  // all chars joined, stopwords kept-out via compact? compact keeps all
  add(allToks.join(''));               // full join incl stopwords
  add(toks.join(''));                  // meaningful tokens joined
  add(allToks.join('-'));              // hyphenated
  add(toks.join('-'));
  if (toks[0]) add(toks[0]);           // first meaningful token
  if (allToks[0]) add(allToks[0]);
  return [...set];
}

async function fetchTenant(slug) {
  const res = await fetch(API, { headers: { ...HEADERS_BASE, 'X-Tenant': slug } });
  if (!res.ok) return { ok: false, status: res.status };
  let json;
  try { json = await res.json(); } catch { return { ok: false, status: 'parse' }; }
  // real tenant => object with tenantName + jobsPage; non-tenant => [] (array)
  if (Array.isArray(json)) return { ok: true, exists: false };
  return { ok: true, exists: true, data: json };
}

function nameMatches(companyName, tenantName) {
  const a = new Set(tokens(companyName));
  const b = new Set(tokens(tenantName));
  if (a.size === 0 || b.size === 0) return compact(companyName) === compact(tenantName);
  // share at least one meaningful token, or compact substring
  for (const t of a) if (b.has(t) && t.length >= 3) return true;
  const ca = compact(companyName), cb = compact(tenantName);
  return (ca.length >= 5 && cb.includes(ca)) || (cb.length >= 5 && ca.includes(cb));
}

(async () => {
  const companies = loadCompanies();
  const found = [];      // {company, tenantName, slug, jobsCount}
  const results = [];    // filtered remote+role rows
  let checked = 0, tenantsFound = 0;

  await pool(companies, async (company) => {
    const variants = slugVariants(company);
    for (const slug of variants) {
      let r;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { r = await fetchTenant(slug); break; }
        catch (e) { await sleep(400); r = { ok: false }; }
      }
      if (!r || !r.ok || !r.exists) continue;
      const data = r.data;
      const tenantName = data.tenantName || slug;
      if (!nameMatches(company, tenantName)) continue; // slug collision w/ different company
      // matched tenant for this company
      const jobs = Array.isArray(data.jobsPage) ? data.jobsPage : [];
      found.push({ company, tenantName, slug, jobsCount: jobs.length });
      tenantsFound++;
      for (const j of jobs) {
        if (String(j.status || '').toLowerCase() !== 'published' && j.status) continue;
        const role = matchRole(j.displayName);
        const wp = String(j.workplaceType || '').toLowerCase();
        const remote = wp.includes('remote') || wp.includes('remoto');
        if (!role || !remote) continue;
        results.push({
          platform: 'InHire',
          companyList: company,
          companyInhire: tenantName,
          role,
          jobTitle: j.displayName,
          workplaceType: j.workplaceType,
          location: j.location || '',
          url: `https://${slug}.inhire.app/vagas/${j.jobId}/${slugify(j.displayName)}`,
          publishedDate: ''
        });
      }
      break; // stop at first matching tenant
    }
    checked++;
    if (checked % 100 === 0) process.stdout.write(`  [inhire] checked ${checked}/${companies.length}, tenants found ${tenantsFound}\n`);
  }, 16);

  console.log(`[inhire] companies checked: ${companies.length}`);
  console.log(`[inhire] InHire tenants matched: ${tenantsFound}`);
  found.sort((a,b)=>a.company.localeCompare(b.company));
  console.log('[inhire] tenants:', found.map(f => `${f.company}[${f.jobsCount}]`).join(', '));
  console.log(`[inhire] remote+role rows: ${results.length}`);
  fs.writeFileSync(path.join(DIR, 'inhire_results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(DIR, 'inhire_tenants.json'), JSON.stringify(found, null, 2));
})();
