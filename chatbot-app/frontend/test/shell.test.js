import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = join(__dirname, "..");
const SRC = join(FRONTEND_ROOT, "src");
const COMPONENTS = join(SRC, "components");

const REQUIRED_PATHS = {
  indexHtml: join(FRONTEND_ROOT, "index.html"),
  mainJsx: join(SRC, "main.jsx"),
  appJsx: join(SRC, "App.jsx"),
  indexCss: join(SRC, "index.css"),
  chatLayout: join(COMPONENTS, "ChatLayout.jsx"),
  messageList: join(COMPONENTS, "MessageList.jsx"),
  messageBubble: join(COMPONENTS, "MessageBubble.jsx"),
  messageInput: join(COMPONENTS, "MessageInput.jsx"),
  viteConfig: join(FRONTEND_ROOT, "vite.config.js"),
  packageJson: join(FRONTEND_ROOT, "package.json"),
};

describe("Chatbot frontend shell", () => {
  describe("project layout", () => {
    it("provides index.html with a React root mount point", () => {
      // covers AC-1
      expect(existsSync(REQUIRED_PATHS.indexHtml)).toBe(true);
      const html = readFileSync(REQUIRED_PATHS.indexHtml, "utf8");
      expect(html).toMatch(/id=["']root["']/);
    });

    it("provides chat layout components for history and input", () => {
      // covers AC-1
      expect(existsSync(REQUIRED_PATHS.chatLayout)).toBe(true);
      expect(existsSync(REQUIRED_PATHS.messageList)).toBe(true);
      expect(existsSync(REQUIRED_PATHS.messageInput)).toBe(true);
    });
  });

  describe("HTML structure", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(REQUIRED_PATHS.indexHtml, "utf8");
    });

    it("does not embed provider API keys in static markup", () => {
      // covers AC-20
      expect(html).not.toMatch(/OPENAI_API_KEY/);
      expect(html).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
    });
  });

  describe("CSS layout", () => {
    let css;

    beforeAll(() => {
      css = readFileSync(REQUIRED_PATHS.indexCss, "utf8");
    });

    it("styles user and assistant messages as visually distinct bubbles", () => {
      // covers AC-12
      expect(css).toMatch(/message-bubble--user/);
      expect(css).toMatch(/message-bubble--assistant/);
    });

    it("keeps the message list scrollable for in-session history", () => {
      // covers AC-14
      expect(css).toMatch(/\.message-list/);
      expect(css).toMatch(/overflow-y:\s*auto/);
    });

    it("avoids horizontal clipping on desktop chat column", () => {
      // covers AC-19
      expect(css).toMatch(/max-width/);
      expect(css).not.toMatch(/overflow-x:\s*scroll/);
      expect(css).toMatch(/word-break:\s*break-word|overflow-wrap:\s*break-word/);
    });

    it("wraps long message text without breaking layout", () => {
      // covers AC-22
      expect(css).toMatch(/word-break:\s*break-word|overflow-wrap:\s*break-word/);
    });
  });

  describe("component contracts", () => {
    it("exports MessageBubble with role-based styling hooks", async () => {
      // covers AC-12
      const m = await import(pathToFileURL(REQUIRED_PATHS.messageBubble).href);
      expect(m.MessageBubble ?? m.default).toBeTypeOf("function");
    });

    it("exports MessageInput for ongoing conversation", async () => {
      // covers AC-13
      const m = await import(pathToFileURL(REQUIRED_PATHS.messageInput).href);
      expect(m.MessageInput ?? m.default).toBeTypeOf("function");
    });

    it("exports ChatLayout composing list and input regions", async () => {
      // covers AC-1
      const m = await import(pathToFileURL(REQUIRED_PATHS.chatLayout).href);
      expect(m.ChatLayout ?? m.default).toBeTypeOf("function");
    });
  });

  describe("source secret hygiene", () => {
    it("does not hardcode OpenAI keys in frontend source files", () => {
      // covers AC-20
      const srcFiles = collectSourceFiles(SRC);
      expect(srcFiles.length).toBeGreaterThan(0);
      for (const file of srcFiles) {
        const text = readFileSync(file, "utf8");
        expect(text).not.toMatch(/OPENAI_API_KEY/);
        expect(text).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
      }
    });
  });

  describe("vite dev proxy", () => {
    it("proxies /api to the backend for LLM requests", () => {
      // covers AC-17
      const config = readFileSync(REQUIRED_PATHS.viteConfig, "utf8");
      expect(config).toMatch(/['"]\/api['"]/);
      expect(config).toMatch(/3001|localhost/);
    });
  });
});

/**
 * @param {string} dir
 * @returns {string[]}
 */
function collectSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}
