import { defineConfig } from "vitest/config";

// integration tests share one database: run the files one after another
export default defineConfig({ test: { include: ["test/**/*.test.ts"], fileParallelism: false, testTimeout: 20_000 } });
