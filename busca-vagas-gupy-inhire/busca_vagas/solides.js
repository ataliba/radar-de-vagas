const fs = require('fs');
const path = require('path');
const { DIR, loadCompanies, compact, matchRole, isRemote, sleep } = require('./lib.js');

const QUERIES = [
  'DevOps', 'SRE', 'Site Reliability Engineer',
  'Cloud', 'Cloud Engineer', 'Cloud Security', 'Analista Cloud', 'Nuvem', 'Platform Engineer',
  'Kubernetes',
  'Infraestrutura', 'Analista de Infraestrutura', 'Sysadmin', 'Administrador de Sistemas'
];

const API = 'https://apigw.solides.com.br/jobs/v3/portal-vacancies-new';
// NOTE: backend silently returns count=0/data=[] for take>14 (undocumented cap) — keep take<=14.
const TAKE = 14;

async function fetchPage(q, page) {
  const url = `${API}?title=${encodeURIComponent(q)}&page=${page}&take=${TAKE}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${q}@${page}`);
  const text = await res.text();
  return JSON.parse(text); // response body may contain raw control chars in description fields
}

async function fetchAll(q) {
  const MAX_PAGE = 60; // safety cap (60*14 = 840 vagas por termo)
  let page = 1, out = [], totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGE) {
    let json = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try { json = await fetchPage(q, page); break; }
      catch (e) {
        if (attempt === 4) { console.log(`\n  [solides] desisti de "${q}"@${page} depois de 5 tentativas: ${e.message}`); break; }
        await sleep(1000 * (attempt + 1));
      }
    }
    if (!json) break; // API instável nessa página — mantém o que já pooled e segue pra próxima query
    const d = json.data || {};
    const data = d.data || [];
    out.push(...data);
    totalPages = d.totalPages || 0;
    if (data.length === 0) break;
    page++;
    await sleep(300);
  }
  return { total: out.length, jobs: out };
}

(async () => {
  const companies = loadCompanies();
  const listCompact = companies.map(c => ({ orig: c, c: compact(c) })).filter(x => x.c.length >= 2);
  function matchCompany(companyName) {
    const cp = compact(companyName);
    if (!cp) return null;
    let hit = listCompact.find(x => x.c === cp);
    if (hit) return hit.orig;
    hit = listCompact.find(x => (x.c.length >= 5 && cp.includes(x.c)) || (cp.length >= 5 && x.c.includes(cp)));
    return hit ? hit.orig : null;
  }

  const byId = new Map();
  const jobTypeValues = new Set();
  for (const q of QUERIES) {
    process.stdout.write(`  [solides] "${q}" ... `);
    const { total, jobs } = await fetchAll(q);
    for (const j of jobs) byId.set(j.id, j); // dedup across queries
    console.log(`total=${total} fetched=${jobs.length}`);
  }
  console.log(`[solides] unique jobs pooled: ${byId.size}`);

  const results = [];
  let remoteCount = 0, roleCount = 0, inList = 0, outList = 0;
  for (const j of byId.values()) {
    jobTypeValues.add(j.jobType);
    const role = matchRole(j.title);
    if (!role) continue;
    roleCount++;
    if (!isRemote(j.jobType, j.homeOffice)) continue;
    remoteCount++;
    const company = matchCompany(j.companyName);
    if (company) inList++; else outList++;
    results.push({
      platform: 'Solides',
      companyList: company || j.companyName,
      companySolides: j.companyName,
      na_lista: company ? 'Sim' : 'Não',
      role,
      jobTitle: j.title,
      workplaceType: j.jobType,
      location: [j.city && j.city.name, j.state && j.state.code].filter(Boolean).join(' / '),
      // j.redirectLink aponta pra <empresa>.solides.jobs — subdomínio quase nunca
      // provisionado (DNS NXDOMAIN pra maioria das empresas testadas). A URL do
      // portal (vagas.solides.com.br/vagas/<id>) é a que de fato abre.
      url: `https://vagas.solides.com.br/vagas/${j.id}`,
      publishedDate: j.createdAt || ''
    });
  }
  console.log(`[solides] jobType values seen: ${[...jobTypeValues].join(', ')}`);
  console.log(`[solides] role-matched=${roleCount} remote=${remoteCount} -> rows=${results.length} (in-list=${inList}, fora-da-lista=${outList})`);
  fs.writeFileSync(path.join(DIR, 'solides_results.json'), JSON.stringify(results, null, 2));
  console.log(`[solides] wrote ${results.length} rows -> solides_results.json`);

  const presence = new Map();
  for (const j of byId.values()) {
    const company = matchCompany(j.companyName);
    if (!company) continue;
    if (!presence.has(company)) presence.set(company, { empresa: company, nome_na_plataforma: j.companyName, vagas_no_pool: 0 });
    presence.get(company).vagas_no_pool++;
  }
  const presenceArr = [...presence.values()].sort((a, b) => a.empresa.localeCompare(b.empresa));
  fs.writeFileSync(path.join(DIR, 'solides_presence.json'), JSON.stringify(presenceArr, null, 2));
  console.log(`[solides] in-list companies present in Solides search pool: ${presenceArr.length}`);
})();
