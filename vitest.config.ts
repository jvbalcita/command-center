import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Silence the "No test files found" warning when all suites pass.
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
