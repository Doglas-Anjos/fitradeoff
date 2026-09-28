# A tela do FITradeoff.
#
#   docker build -t fitradeoff-web ./web
#
# Duas etapas. A primeira instala tudo e constroi; a segunda leva so o que o
# `next start` precisa em execucao. Sem a separacao, as dependencias de
# desenvolvimento -- typescript, vitest, eslint e o que elas arrastam -- ficam
# na imagem publicada, que e superficie sem contrapartida.

# --- etapa 1: construir -----------------------------------------------------
FROM node:22-slim AS construcao

WORKDIR /web

# O manifesto antes do codigo, para a camada de instalacao sobreviver a mudanca
# de codigo. Sem isto, cada ajuste num componente reinstala o Next inteiro.
COPY package.json package-lock.json ./

# `npm ci` e nao `npm install`: ci instala exatamente o que o lock diz e falha
# se o package.json divergir dele. `install` resolveria as faixas de versao de
# novo, e a imagem publicada poderia sair com uma dependencia que ninguem
# testou -- sem nada indicando isso.
RUN npm ci

COPY . .

# A URL da API entra em tempo de BUILD porque o next.config.mjs a le para montar
# a reescrita de /api/*. Em producao quem responde e o servico `api` na rede
# interna do compose.
ENV API_URL=http://api:3001
RUN npm run build

# --- etapa 2: executar ------------------------------------------------------
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /web

COPY --from=construcao /web/package.json /web/package-lock.json ./
# Sem as de desenvolvimento. O `next` em si e dependencia de producao, entao o
# `next start` continua disponivel.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=construcao /web/.next ./.next
COPY --from=construcao /web/public ./public
COPY --from=construcao /web/next.config.mjs ./

# A imagem node:slim ja traz o usuario `node`, sem privilegio. Processo exposto
# nao roda como root.
RUN chown -R node:node /web
USER node

EXPOSE 3000

# A raiz, e nao uma rota de saude propria: o Next nao expoe uma, e a raiz e
# servida pelo mesmo processo que atenderia qualquer outra. Se ela responde, o
# servidor esta de pe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
