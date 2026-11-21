# REST API image (infra/docker-compose.yml, profile "app"; infra/playtest). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t htk-api .
# Also carries the database CLI: node dist/db.js migrate | seed (MIGRATIONS_DIR).
FROM node:20-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @htk/api... && pnpm --filter @htk/api build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production API_PORT=3000 API_PREFIX=/api CONTENT_DIR=/app/content MAP_DIR=/app/maps \
    MIGRATIONS_DIR=/app/migrations
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/packages/content ./content
COPY --from=build /repo/art/prototype/maps ./maps
COPY --from=build /repo/packages/db/migrations ./migrations
# runtime deps kept external by the esbuild bundle; @htk/* workspace packages are bundled in
RUN echo '{"type":"module","private":true}' > package.json && npm install --omit=dev --no-package-lock \
    fastify@5 @fastify/cookie@11 @node-rs/argon2@2 ioredis@5 jose@6 pg@8 yaml@2 zod@3
EXPOSE 3000
CMD ["node", "dist/main.js"]
