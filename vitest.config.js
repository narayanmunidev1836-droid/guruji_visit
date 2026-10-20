import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      // `server-only` throws outside the Next.js server bundle; tests run on the server, so stub it.
      "server-only": path.join(root, "tests/stubs/server-only.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js", "tests/integration/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    // Integration tests share one database, so test files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
