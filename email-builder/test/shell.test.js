import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = join(__dirname, "..", "index.html");
const APP_JS_PATH = join(__dirname, "..", "app.js");
const STYLES_CSS_PATH = join(__dirname, "..", "styles.css");
const PACKAGE_JSON_PATH = join(__dirname, "..", "package.json");

describe("Email Builder Shell", () => {
  describe("File Structure", () => {
    it("has an index.html file", () => {
      expect(existsSync(INDEX_HTML_PATH)).toBe(true);
    });

    it("has an app.js file", () => {
      expect(existsSync(APP_JS_PATH)).toBe(true);
    });

    it("has a styles.css file", () => {
      expect(existsSync(STYLES_CSS_PATH)).toBe(true);
    });

    it("has a package.json file", () => {
      expect(existsSync(PACKAGE_JSON_PATH)).toBe(true);
    });
  });

  describe("HTML Structure", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML_PATH, "utf8");
    });

    it("contains the main email builder container", () => {
      expect(html).toMatch(/class="email-builder"/);
    });

    it("includes the builder panel for components", () => {
      expect(html).toMatch(/class="builder-panel"/);
      expect(html).toMatch(/id="composition-list"/);
    });

    it("exposes header and paragraph controls", () => {
      expect(html).toMatch(/id="header-title-input"/);
      expect(html).toMatch(/id="add-header-btn"/);
      expect(html).toMatch(/id="paragraph-text-input"/);
      expect(html).toMatch(/id="add-paragraph-btn"/);
    });

    it("has an email preview region", () => {
      expect(html).toMatch(/class="preview-section"/);
      expect(html).toMatch(/id="email-preview"/);
    });

    it("loads styles and the application script", () => {
      expect(html).toMatch(/href="styles\.css"/);
      expect(html).toMatch(/src="app\.js"/);
      expect(html).toMatch(/type="module"/);
    });
  });

  describe("App Module", () => {
    it("app.js is a valid JavaScript module", async () => {
      const m = await import(pathToFileURL(APP_JS_PATH).href);
      expect(m).toBeTruthy();
      expect(typeof m).toBe("object");
    });

    it("exports createEmailBuilder function", async () => {
      const m = await import(pathToFileURL(APP_JS_PATH).href);
      expect(m.createEmailBuilder).toBeTypeOf("function");
    });
  });

  describe("Package Configuration", () => {
    let pkg;

    beforeAll(() => {
      const content = readFileSync(PACKAGE_JSON_PATH, "utf8");
      pkg = JSON.parse(content);
    });

    it("package.json is valid and has correct name", () => {
      expect(pkg).toBeTruthy();
      expect(pkg.name).toBe("email-builder");
    });

    it("package.json has correct test script", () => {
      expect(pkg.scripts.test).toBe("vitest run");
    });

    it("package.json has required devDependencies", () => {
      expect(pkg.devDependencies).toBeTruthy();
      expect(pkg.devDependencies.vitest).toBeDefined();
      expect(pkg.devDependencies.jsdom).toBeDefined();
    });
  });

  describe("Preview markup contract", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(APP_JS_PATH, "utf8");
    });

    it("preview renderer marks header and paragraph components", () => {
      expect(html).toMatch(/data-component-type=\s*["']header["']/);
      expect(html).toMatch(/data-component-type=\s*["']paragraph["']/);
      expect(html).toMatch(/email-component-header/);
      expect(html).toMatch(/email-component-paragraph/);
    });

    it("escapes HTML when rendering header titles", () => {
      expect(html).toMatch(/function escapeHtml/);
    });
  });
});
