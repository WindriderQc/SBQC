FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

USER node

CMD ["node", "sbqc_serv.js"]
