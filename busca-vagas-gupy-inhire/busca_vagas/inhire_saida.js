// Gera as saidas finais da InHire a partir da validacao:
//   inhire_results.json       -> todas as 38 vagas remotas+cargo (in-list + novas), consumido por merge.js
//   inhire_new_companies.json -> empresas InHire com vaga aberta que estao FORA da sua lista (aba bonus)
const fs = require('fs'), path = require('path');
const DIR = __dirname;

const allVagas = JSON.parse(fs.readFileSync(path.join(DIR, 'inhire_all_vagas.json'), 'utf8'));
const tenants  = JSON.parse(fs.readFileSync(path.join(DIR, 'inhire_all_tenants.json'), 'utf8'));

const results = allVagas.map(x => ({
  platform: 'InHire',
  companyList: x.companyList || x.companyInhire,
  companyInhire: x.companyInhire,
  role: x.role, jobTitle: x.jobTitle, workplaceType: x.workplaceType, location: x.location,
  url: x.url, publishedDate: '', na_lista: x.inUserList ? 'Sim' : 'Não'
}));
fs.writeFileSync(path.join(DIR, 'inhire_results.json'), JSON.stringify(results, null, 2));

const novas = tenants.filter(t => !t.listCompany && t.jobsCount > 0)
  .map(t => ({ empresa: t.tenantName, vagas_total: t.jobsCount, url: `https://${t.slug}.inhire.app/vagas` }))
  .sort((a, b) => b.vagas_total - a.vagas_total);
fs.writeFileSync(path.join(DIR, 'inhire_new_companies.json'), JSON.stringify(novas, null, 2));

console.log(`inhire_results.json -> ${results.length} vagas (${results.filter(r=>r.na_lista==='Sim').length} da lista, ${results.filter(r=>r.na_lista==='Não').length} novas)`);
console.log(`inhire_new_companies.json -> ${novas.length} empresas InHire fora da lista com vaga aberta`);
