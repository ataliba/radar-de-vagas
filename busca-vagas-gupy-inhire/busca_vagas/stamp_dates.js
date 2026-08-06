// Carimba a data em que cada vaga foi vista pela PRIMEIRA vez.
// Mantem um historico persistente em seen.json { chave: "YYYY-MM-DD" } e escreve
// o campo `detectado_em` em cada linha de vagas_final.json. Vagas novas ganham a
// data de hoje -> a coluna "Detectada em" mostra na hora o que abriu desde a ultima rodada.
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const VF = path.join(DIR, 'vagas_final.json');
const SF = path.join(DIR, 'seen.json');

const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, horario local
const jobId = l => { const m = String(l || '').match(/\/vagas\/([0-9a-f-]{36})/i); return m ? m[1] : null; };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const key = x => jobId(x.link) || norm((x.empresa || x.nome_na_plataforma || '') + '|' + x.titulo_vaga);

const vagas = JSON.parse(fs.readFileSync(VF, 'utf8'));
let seen = {};
try { seen = JSON.parse(fs.readFileSync(SF, 'utf8')); } catch { /* primeira vez */ }

for (const x of vagas) {
  const k = key(x);
  if (!seen[k]) seen[k] = today;
  x.detectado_em = seen[k];
}

fs.writeFileSync(SF, JSON.stringify(seen, null, 2));
fs.writeFileSync(VF, JSON.stringify(vagas, null, 2));
const novasHoje = vagas.filter(x => x.detectado_em === today).length;
console.log(`stamp_dates: ${vagas.length} vagas carimbadas; detectadas hoje (${today}): ${novasHoje}`);
