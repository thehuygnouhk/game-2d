import { defineConfig } from "vite";

// Step B1 reuses the browser prototype's generated assets (maps, sprites); they move to packages/content in step B2.
export default defineConfig({
  publicDir: "../../prototype/playable/assets",
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1600 },
});
