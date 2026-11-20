import { defineConfig } from "@playwright/test";

// Step B1 acceptance: two browsers see each other walking on M001 (docs/product/roadmap.md §8).
const WS_PORT = 7101,
  WEB_PORT = 5199;
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
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
      command: `pnpm --filter @htk/game-server exec tsx src/main.ts`,
      env: { GAME_WS_PORT: String(WS_PORT), DEV_GUEST: "1" },
      port: WS_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      env: { VITE_GAME_WS_URL: `ws://127.0.0.1:${WS_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
