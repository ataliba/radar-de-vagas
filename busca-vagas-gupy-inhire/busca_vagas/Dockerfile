# Contexto de build: a raiz do repo busca-vagas-gupy-inhire (precisa do
# empresas.xlsx que fica um nivel acima desta pasta).
#
# Fase de transicao (migracao incremental Node -> Python por plataforma):
# empresas + Gupy ja rodam em Python (radar_vagas/), o resto ainda em Node.
# Imagem carrega os dois runtimes ate a migracao terminar.
FROM node:24-alpine

RUN apk add --no-cache unzip curl tzdata python3 py3-pip
ENV TZ=America/Sao_Paulo

WORKDIR /opt/scraper
COPY empresas.xlsx ./
COPY busca_vagas/*.js ./
COPY busca_vagas/entrypoint.sh /entrypoint.sh
COPY radar_vagas ./radar_vagas
RUN pip install --no-cache-dir --break-system-packages -r radar_vagas/requirements.txt \
  && chmod +x /entrypoint.sh \
  && printf '0 8,12,18 * * * /entrypoint.sh once >> /proc/1/fd/1 2>&1\n' > /etc/crontabs/root

ENTRYPOINT ["/entrypoint.sh"]
