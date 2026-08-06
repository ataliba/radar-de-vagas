# Contexto de build: a raiz do repo busca-vagas-gupy-inhire (precisa do
# empresas.xlsx que fica um nivel acima desta pasta).
FROM node:24-alpine

RUN apk add --no-cache unzip curl tzdata
ENV TZ=America/Sao_Paulo

WORKDIR /opt/scraper
COPY empresas.xlsx ./
COPY busca_vagas/*.js ./
COPY busca_vagas/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && printf '30 11,18 * * * /entrypoint.sh once >> /proc/1/fd/1 2>&1\n' > /etc/crontabs/root

ENTRYPOINT ["/entrypoint.sh"]
