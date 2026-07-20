const fs = require('fs');
const path = require('path');
const { DIR } = require('./lib.js');

const gupy = JSON.parse(fs.readFileSync(path.join(DIR, 'gupy_presence_full.json'), 'utf8'));
const inhireAll = JSON.parse(fs.readFileSync(path.join(DIR, 'inhire_all_tenants.json'), 'utf8'));
const inhire = inhireAll.filter(t => t.listCompany); // only companies from the user's list

const map = new Map();
function get(emp){ if(!map.has(emp)) map.set(emp,{empresa:emp,gupy:'',gupy_url:'',inhire:'',inhire_url:'',inhire_vagas_total:''}); return map.get(emp); }

for (const g of gupy){ const e=get(g.empresa); e.gupy='Sim'; e.gupy_url=g.url; }
for (const t of inhire){ const e=get(t.listCompany); e.inhire='Sim'; e.inhire_url=`https://${t.slug}.inhire.app/vagas`; e.inhire_vagas_total=t.jobsCount; }

const arr=[...map.values()].sort((a,b)=>a.empresa.localeCompare(b.empresa));
fs.writeFileSync(path.join(DIR,'presence_combined.json'), JSON.stringify(arr,null,2));
const both=arr.filter(x=>x.gupy&&x.inhire).length;
console.log(`Presença combinada: ${arr.length} empresas (Gupy=${gupy.length}, InHire=${inhire.length}, em ambas=${both})`);
