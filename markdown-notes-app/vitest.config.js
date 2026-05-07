import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["qa/**/*.qa.test.js"],
  },
});
