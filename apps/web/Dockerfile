# Web app (SvelteKit Node server):  docker build -t web apps/web
FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /srv
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . ./
RUN pnpm build && pnpm prune --prod --ignore-scripts

FROM node:24-slim
ENV NODE_ENV=production PORT=3000 \
    # Uploads are bounded by the app (64 MB); the adapter default (512 KB) would reject them.
    BODY_SIZE_LIMIT=70M
WORKDIR /srv
RUN mkdir -p /srv/.data && chown node /srv/.data
COPY --from=build --chown=node /srv/build ./build
COPY --from=build --chown=node /srv/node_modules ./node_modules
COPY --from=build --chown=node /srv/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
