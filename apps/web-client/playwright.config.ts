import { defineConfig } from "@playwright/test";

// Acceptance of steps B1-B3 (docs/product/roadmap.md §8): accounts, two browsers walking, fighting and chatting.
// Needs PostgreSQL and Redis (E2E_DATABASE_URL, E2E_REDIS_URL); the API resets the e2e database before starting.
const API_PORT = 3101,
  WS_PORT = 7101,
  WEB_PORT = 5199;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://htk:htk@localhost:5432/htk_e2e";
const REDIS_URL = process.env.E2E_REDIS_URL ?? "redis://localhost:6379/14";
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1, // the tests share one game server and its zones
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "off",
    launchOptions: {
      args: [
        "--use-gl=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
      ],
    },
  },
  webServer: [
    {
      command: `pnpm --filter @htk/db reset && pnpm --filter @htk/api exec tsx src/main.ts`,
      env: {
        DATABASE_URL,
        REDIS_URL,
        API_PORT: String(API_PORT),
        API_PREFIX: "/api",
        JWT_SECRET: "e2e-secret-0123456789abcdef0123456789",
        PUBLIC_WS_URL: `ws://127.0.0.1:${WS_PORT}`,
        RATE_LIMIT_SCALE: "100",
        API_LOG: "0",
      },
      url: `http://127.0.0.1:${API_PORT}/api/status`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm --filter @htk/game-server exec tsx src/main.ts`,
      env: { GAME_WS_PORT: String(WS_PORT), DATABASE_URL, REDIS_URL, GAME_SEED: "7", DEV_GUEST: "0" },
      port: WS_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      env: { VITE_API_PROXY: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
