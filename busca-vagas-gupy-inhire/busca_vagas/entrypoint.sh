#!/bin/sh
set -e

# Codigo sempre vem fresco da imagem a cada boot (evita ficar preso a versao
# antiga se o volume de /data ja existia de um deploy anterior). Os JSON
# gerados pelo pipeline (companies.json, vagas_final.json, seen.json etc.)
# nao existem em /opt/scraper, entao nunca sao sobrescritos aqui — persistem
# entre reinicios no volume.
mkdir -p /data
cp -f /opt/scraper/*.js /data/
cp -f /opt/scraper/empresas.xlsx /data/empresas.xlsx

executar() {
  echo "==== pipeline $(date) ===="
  ( cd /data && node rodar_tudo.js )
  echo "==== avisando o Rails pra importar ===="
  curl -fsS -X POST "${RAILS_IMPORT_URL:-http://web:3000/import}" \
    && echo "ok" \
    || echo "aviso: POST $RAILS_IMPORT_URL falhou (Rails fora do ar?)"
}

if [ "$1" = "once" ]; then
  executar
  exit 0
fi

# Roda uma vez já na subida, pra não ficar com /data vazio até o próximo cron.
executar
crond -f -l 2
