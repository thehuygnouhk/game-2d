# Game server image (infra/docker-compose.yml, profile "app"). Build from the repo root:
#   docker build -f apps/game-server/Dockerfile -t htk-game-server .
FROM node:20-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @htk/game-server... && pnpm --filter @htk/game-server build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production GAME_WS_PORT=7001 MAP_DIR=/app/maps
COPY --from=build /repo/apps/game-server/dist ./dist
COPY --from=build /repo/prototype/playable/assets/maps ./maps
# runtime deps kept external by the esbuild bundle; @htk/shared is bundled in
RUN echo '{"type":"module","private":true}' > package.json && npm install --omit=dev --no-package-lock ws@8 @msgpack/msgpack@3 zod@3
EXPOSE 7001
CMD ["node", "dist/main.js"]
