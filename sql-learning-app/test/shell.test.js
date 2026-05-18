import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INDEX_HTML = join(ROOT, "index.html");
const APP_JS = join(ROOT, "app.js");
const STYLES_CSS = join(ROOT, "styles.css");

describe("SQL learning app shell", () => {
  describe("project layout", () => {
    it("provides index.html as the app entry", () => {
      // covers AC-4
      expect(existsSync(INDEX_HTML)).toBe(true);
    });

    it("provides app.js as an ES module bootstrap", () => {
      // covers AC-4
      expect(existsSync(APP_JS)).toBe(true);
    });

    it("provides styles.css for layout", () => {
      // covers AC-4
      expect(existsSync(STYLES_CSS)).toBe(true);
    });
  });

  describe("German UI (AC-2)", () => {
    let html;
    let appSource;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML, "utf8");
      appSource = readFileSync(APP_JS, "utf8");
    });

    it("uses German lang attribute on the document", () => {
      // covers AC-2
      expect(html).toMatch(/lang="de"/i);
    });

    it("shows a German welcome on the start view", () => {
      // covers AC-2
      const germanWelcome =
        /Willkommen|SQL lernen|Lern-App/i.test(html) ||
        /Willkommen|SQL lernen|Lern-App/i.test(appSource);
      expect(germanWelcome).toBe(true);
    });

    it("does not expose English-only primary navigation labels", () => {
      // covers AC-2
      const forbidden = ["Sign in", "Log in", "Sign up", "Register", "Login"];
      const combined = `${html}\n${appSource}`;
      for (const label of forbidden) {
        expect(combined).not.toContain(label);
      }
    });
  });

  describe("no authentication (AC-3)", () => {
    let html;
    let appSource;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML, "utf8");
      appSource = readFileSync(APP_JS, "utf8");
    });

    it("does not render login or signup UI", () => {
      // covers AC-3
      const combined = `${html}\n${appSource}`.toLowerCase();
      expect(combined).not.toMatch(/\b(login|anmelden|registrieren|signup|sign up)\b/);
    });

    it("does not reference account storage keys", () => {
      // covers AC-3
      const combined = `${html}\n${appSource}`;
      expect(combined).not.toMatch(/user-token|auth-token|session-token/i);
    });
  });

  describe("learning path overview (AC-4)", () => {
    let appModule;

    beforeAll(async () => {
      appModule = await import(pathToFileURL(APP_JS).href);
    });

    it("exports renderStartView with the three path phases in German", () => {
      // covers AC-4
      expect(appModule.renderStartView).toBeTypeOf("function");
      const markup = appModule.renderStartView();
      expect(markup).toMatch(/Konzept/i);
      expect(markup).toMatch(/Basics|Grundlagen/i);
      expect(markup).toMatch(/Übung/i);
    });

    it("lists concept before basics before exercises in the overview", () => {
      // covers AC-4
      const markup = appModule.renderStartView();
      const conceptIdx = markup.search(/Konzept/i);
      const basicsIdx = markup.search(/Basics|Grundlagen/i);
      const exercisesIdx = markup.search(/Übung/i);
      expect(conceptIdx).toBeGreaterThanOrEqual(0);
      expect(basicsIdx).toBeGreaterThan(conceptIdx);
      expect(exercisesIdx).toBeGreaterThan(basicsIdx);
    });
  });
});
