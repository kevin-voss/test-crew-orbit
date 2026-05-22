import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INDEX_HTML_PATH = join(ROOT, "index.html");
const APP_JS_PATH = join(ROOT, "app.js");
const STYLES_CSS_PATH = join(ROOT, "styles.css");
const PACKAGE_JSON_PATH = join(ROOT, "package.json");

describe("Pokédex shell", () => {
  describe("static stack layout", () => {
    it("ships index.html, styles.css, and app.js as the core deliverable", () => {
      // covers AC-18
      expect(existsSync(INDEX_HTML_PATH)).toBe(true);
      expect(existsSync(STYLES_CSS_PATH)).toBe(true);
      expect(existsSync(APP_JS_PATH)).toBe(true);
    });

    it("does not require a SPA framework or bundler runtime in package dependencies", () => {
      // covers AC-18
      expect(existsSync(PACKAGE_JSON_PATH)).toBe(true);
      const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      expect(deps.react).toBeUndefined();
      expect(deps.vue).toBeUndefined();
      expect(deps["@angular/core"]).toBeUndefined();
    });

    it("loads app.js and styles.css from index.html without framework imports", () => {
      // covers AC-18
      const html = readFileSync(INDEX_HTML_PATH, "utf8");
      expect(html).toMatch(/href="styles\.css"/);
      expect(html).toMatch(/src="app\.js"/);
      expect(html).not.toMatch(/react|vue|angular/i);
      const appJs = readFileSync(APP_JS_PATH, "utf8");
      expect(appJs).not.toMatch(/from\s+["']react["']/);
    });
  });

  describe("browser entry without auth", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML_PATH, "utf8");
    });

    it("presents the Pokédex shell without login or account UI", () => {
      // covers AC-1
      expect(html).not.toMatch(/sign\s*in|log\s*in|password|api[-_]?key/i);
      expect(html).toMatch(/id="pokedex-catalog"|id='pokedex-catalog'/);
    });

    it("works as a static document with a catalog mount point", () => {
      // covers AC-20
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toMatch(/lang="en"/i);
      expect(html).toMatch(/id="pokedex-catalog"/);
    });
  });

  describe("page identity", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML_PATH, "utf8");
    });

    it("identifies the app as a Pokédex for the first 56 Pokémon in title and header", () => {
      // covers AC-17
      expect(html).toMatch(/<title>[^<]*pok[eé]dex[^<]*56/i);
      expect(html).toMatch(/<h1[^>]*>[^<]*pok[eé]dex[^<]*(56|first\s*56)/i);
    });
  });

  describe("browsable catalog layout", () => {
    it("styles the catalog region for scrolling through all entries on one page", () => {
      // covers AC-3
      const css = readFileSync(STYLES_CSS_PATH, "utf8");
      expect(css).toMatch(/#pokedex-catalog|\.pokedex-catalog/);
      expect(css).toMatch(/overflow|grid|flex/i);
    });
  });
});
