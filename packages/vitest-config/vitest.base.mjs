import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["node_modules", "dist", ".turbo", "e2e/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      exclude: ["**/*.{test,spec}.*", "**/vitest.setup.*"],
    },
  },
});

