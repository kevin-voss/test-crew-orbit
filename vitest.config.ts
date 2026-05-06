import { defineConfig } from "vitest/config";

/**
 * TL `act()` needs React's development build. Shells often set `NODE_ENV=production`; `??=` would not replace it.
 */
process.env.NODE_ENV =
  process.env.NODE_ENV === "production"
    ? "development"
    : (process.env.NODE_ENV ?? "development");

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
    setupFiles: ["./src/test/happyDomBoundingRect.ts"],
    env: {
      NODE_ENV: "test",
    },
  },
});
