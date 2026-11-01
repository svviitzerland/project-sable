# One-shot migration job: docker build -t migrate db && docker run -e DATABASE_URL=... migrate
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY migrate.mjs ./
COPY migrations ./migrations
USER node
CMD ["node", "migrate.mjs"]
