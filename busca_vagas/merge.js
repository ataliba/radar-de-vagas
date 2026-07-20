const fs = require('fs');
const path = require('path');
const { DIR } = require('./lib.js');

const gupy = JSON.parse(fs.readFileSync(path.join(DIR, 'gupy_results.json'), 'utf8'));
const inhire = JSON.parse(fs.readFileSync(path.join(DIR, 'inhire_results.json'), 'utf8'));

function norm(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function alerta(row){
  const t = norm(row.jobTitle);
  const notes = [];
  if (/hibrid|presencial|on-?site/.test(t)) notes.push('título menciona híbrido/presencial — conferir');
  const loc = norm(row.location);
  const brOk = loc === '' || /\bbr\b|brasil|brazil/.test(loc);
  const foreign = /\b(us|usa|eua|singapore|sg|portugal|pt|mexico|argentina|spain|espanha|uk|remote latam|north america)\b/.test(loc);
  if (!brOk && foreign) notes.push('local fora do BR — pode exigir inglês');
  return notes.join('; ');
}

const all = [...gupy, ...inhire].map(r => ({
  empresa: r.companyList,
  plataforma: r.platform,
  na_lista: r.na_lista || 'Sim',
  cargo_categoria: r.role,
  titulo_vaga: r.jobTitle.trim(),
  tipo: r.workplaceType,
  local: r.location,
  link: r.url,
  nome_na_plataforma: r.companyGupy || r.companyInhire || '',
  publicado: r.publishedDate || '',
  alerta: alerta(r)
}));

// dedupe by link, then by empresa+titulo
const seen = new Set();
const deduped = [];
for (const r of all) {
  const k1 = r.link || (r.empresa + '|' + r.titulo_vaga);
  const k2 = norm(r.empresa) + '|' + norm(r.titulo_vaga) + '|' + r.plataforma;
  if (seen.has(k1) || seen.has(k2)) continue;
  seen.add(k1); seen.add(k2);
  deduped.push(r);
}

deduped.sort((a,b) =>
  (a.na_lista === b.na_lista ? 0 : a.na_lista === 'Sim' ? -1 : 1) ||
  a.plataforma.localeCompare(b.plataforma) ||
  a.empresa.localeCompare(b.empresa) ||
  a.cargo_categoria.localeCompare(b.cargo_categoria));

fs.writeFileSync(path.join(DIR, 'vagas_final.json'), JSON.stringify(deduped, null, 2));
console.log(`Merged: gupy=${gupy.length} inhire=${inhire.length} -> deduped=${deduped.length}`);
console.log(`Gupy rows: ${deduped.filter(r=>r.plataforma==='Gupy').length}, InHire rows: ${deduped.filter(r=>r.plataforma==='InHire').length}`);
const withAlert = deduped.filter(r=>r.alerta).length;
console.log(`Rows with alerta: ${withAlert}`);
