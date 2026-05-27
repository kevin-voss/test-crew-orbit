import { transformWithEsbuild } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/** @type {import('vite').Plugin} */
function jsxTestFiles() {
  return {
    name: "jsx-test-files",
    enforce: "pre",
    async transform(code, id) {
      if (!/\/test\/.*\.test\.js$/.test(id)) {
        return null;
      }
      return transformWithEsbuild(code, id, {
        loader: "jsx",
        jsx: "automatic",
      });
    },
  };
}

export default defineConfig({
  plugins: [jsxTestFiles(), react({ include: "**/*.{jsx,js}" })],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup-dom.mjs"],
    include: ["test/acceptance.test.js", "test/useChatSession.test.js"],
    transformMode: {
      web: [/\.[jt]sx?$/],
      ssr: [/\.[jt]sx?$/],
    },
  },
});
