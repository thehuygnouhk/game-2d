# Game server image (infra/docker-compose.yml, profile "app"). Build from the repo root:
#   docker build -f apps/game-server/Dockerfile -t htk-game-server .
FROM node:20-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @htk/game-server... && pnpm --filter @htk/game-server build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production GAME_WS_PORT=7001 CONTENT_DIR=/app/content MAP_DIR=/app/maps
COPY --from=build /repo/apps/game-server/dist ./dist
# content YAML (monsters, items, skills, drops, i18n) and the Tiled maps with their .yaml metadata
COPY --from=build /repo/packages/content ./content
COPY --from=build /repo/art/prototype/maps ./maps
# runtime deps kept external by the esbuild bundle; @htk/shared and @htk/content are bundled in
RUN echo '{"type":"module","private":true}' > package.json && npm install --omit=dev --no-package-lock ws@8 @msgpack/msgpack@3 zod@3 yaml@2
EXPOSE 7001
CMD ["node", "dist/main.js"]
