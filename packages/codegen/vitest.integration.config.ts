import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/__tests__/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    testTimeout: 30000, // Longer timeout for SDK generation
    hookTimeout: 30000,
    teardownTimeout: 10000,
    setupFiles: ["./src/__tests__/integration/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
