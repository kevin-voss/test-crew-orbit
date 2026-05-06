import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.react.test.tsx"],
    environmentMatchGlobs: [["**/*.react.test.tsx", "happy-dom"]],
  },
});
