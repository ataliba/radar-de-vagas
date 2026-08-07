const fs = require('fs');
const path = require('path');
const { DIR, loadCompanies, compact, matchRole, isRemote, sleep } = require('./lib.js');

const QUERIES = [
  'DevOps', 'SRE', 'Site Reliability Engineer',
  'Cloud Engineer', 'Cloud Security', 'Platform Engineer',
  'Kubernetes',
  'Infraestrutura', 'Analista de Infraestrutura', 'Sysadmin', 'Administrador de Sistemas'
];

const API = 'https://employability-portal.gupy.io/api/v1/jobs';

async function fetchPage(q, offset, limit) {
  const url = `${API}?jobName=${encodeURIComponent(q)}&offset=${offset}&limit=${limit}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${q}@${offset}`);
  return res.json();
}

async function fetchAll(q) {
  // NOTE: the API's pagination.total is unreliable (caps at `limit` when limit>=100),
  // but offset paging works. Page until a page returns fewer than `limit` rows.
  const limit = 100;
  const MAX_OFFSET = 3000; // safety cap
  let offset = 0, out = [];
  while (offset <= MAX_OFFSET) {
    let json;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { json = await fetchPage(q, offset, limit); break; }
      catch (e) { if (attempt === 2) throw e; await sleep(800); }
    }
    const data = json.data || [];
    out.push(...data);
    if (data.length < limit) break; // last page
    offset += limit;
    await sleep(120);
  }
  return { total: out.length, jobs: out };
}

(async () => {
  const companies = loadCompanies();
  // build lookup of compact list names (len>=5 eligible for substring match)
  const listCompact = companies.map(c => ({ orig: c, c: compact(c) })).filter(x => x.c.length >= 2);
  function matchCompany(careerPageName) {
    const cp = compact(careerPageName);
    if (!cp) return null;
    // exact
    let hit = listCompact.find(x => x.c === cp);
    if (hit) return hit.orig;
    // substring (require the shorter side length>=5 to avoid noise)
    hit = listCompact.find(x => (x.c.length >= 5 && cp.includes(x.c)) || (cp.length >= 5 && x.c.includes(cp)));
    return hit ? hit.orig : null;
  }

  const byId = new Map();
  const wpValues = new Set();
  for (const q of QUERIES) {
    process.stdout.write(`  [gupy] "${q}" ... `);
    const { total, jobs } = await fetchAll(q);
    let kept = 0;
    for (const j of jobs) {
      byId.set(j.id, j); // dedup across queries
    }
    console.log(`total=${total} fetched=${jobs.length}`);
  }
  console.log(`[gupy] unique jobs pooled: ${byId.size}`);

  const results = [];
  let remoteCount = 0, roleCount = 0, inList = 0, outList = 0;
  for (const j of byId.values()) {
    wpValues.add(j.workplaceType);
    const role = matchRole(j.name);
    if (!role) continue;
    roleCount++;
    if (!isRemote(j.workplaceType, j.isRemoteWork)) continue;
    remoteCount++;
    const company = matchCompany(j.careerPageName);
    if (company) inList++; else outList++;
    results.push({
      platform: 'Gupy',
      companyList: company || j.careerPageName, // fora da lista: usa o nome da career page como rótulo
      companyGupy: j.careerPageName,
      na_lista: company ? 'Sim' : 'Não',        // simétrico à InHire: inclui fora-da-lista marcado
      role,
      jobTitle: j.name,
      workplaceType: j.workplaceType,
      location: [j.city, j.state, j.country].filter(Boolean).join(' / '),
      url: j.jobUrl || (j.careerPageUrl ? j.careerPageUrl : ''),
      publishedDate: j.publishedDate || ''
    });
  }
  console.log(`[gupy] workplaceType values seen: ${[...wpValues].join(', ')}`);
  console.log(`[gupy] role-matched=${roleCount} remote=${remoteCount} -> rows=${results.length} (in-list=${inList}, fora-da-lista=${outList})`);
  fs.writeFileSync(path.join(DIR, 'gupy_results.json'), JSON.stringify(results, null, 2));
  console.log(`[gupy] wrote ${results.length} rows -> gupy_results.json`);

  // presence: distinct in-list companies that have ANY active job in Gupy (from the pooled search)
  const presence = new Map();
  for (const j of byId.values()) {
    const company = matchCompany(j.careerPageName);
    if (!company) continue;
    if (!presence.has(company)) presence.set(company, { empresa: company, nome_na_plataforma: j.careerPageName, vagas_no_pool: 0 });
    presence.get(company).vagas_no_pool++;
  }
  const presenceArr = [...presence.values()].sort((a,b)=>a.empresa.localeCompare(b.empresa));
  fs.writeFileSync(path.join(DIR, 'gupy_presence.json'), JSON.stringify(presenceArr, null, 2));
  console.log(`[gupy] in-list companies present in Gupy search pool: ${presenceArr.length}`);
})();
