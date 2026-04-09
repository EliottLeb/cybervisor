FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY worker ./worker
COPY prisma ./prisma
RUN npx prisma generate

CMD ["node", "worker/crawler.js"]
