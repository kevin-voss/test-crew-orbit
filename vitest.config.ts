import { defineConfig } from "vitest/config";

export default defineConfig({
  mode: "test",
  define: {
    "import.meta.env.MODE": JSON.stringify("test"),
    "import.meta.env.DEV": JSON.stringify(true),
    "import.meta.env.PROD": JSON.stringify(false),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.react.test.tsx"],
    environmentMatchGlobs: [["**/*.react.test.tsx", "happy-dom"]],
    env: {
      NODE_ENV: "test",
    },
  },
});
