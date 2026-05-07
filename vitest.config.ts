import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["**/code-organization.test.ts", "node"],
      ["**/stack-charter.test.ts", "node"],
    ],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
