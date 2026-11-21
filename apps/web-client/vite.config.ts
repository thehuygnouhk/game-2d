import { defineConfig } from "vite";

// Maps and sprites come from the art pipeline output shared with the browser prototype (tools/art-proto).
// /api goes to the REST API (apps/api, API_PREFIX=/api) so the refresh cookie stays same-origin.
const api = process.env.VITE_API_PROXY ?? "http://127.0.0.1:3000";
export default defineConfig({
  publicDir: "../../prototype/playable/assets",
  server: { port: 5173, host: true, proxy: { "/api": { target: api, changeOrigin: false } } },
  preview: { port: 4173, proxy: { "/api": { target: api, changeOrigin: false } } },
  build: { chunkSizeWarningLimit: 1600 },
});
