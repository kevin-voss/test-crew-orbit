import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = join(__dirname, "..", "index.html");
const APP_JS_PATH = join(__dirname, "..", "app.js");
const STYLES_CSS_PATH = join(__dirname, "..", "styles.css");
const PACKAGE_JSON_PATH = join(__dirname, "..", "package.json");

describe("Todo App Shell", () => {
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

    it("contains the main app container with class 'app'", () => {
      expect(html).toMatch(/class="app"/);
    });

    it("includes the app header section", () => {
      expect(html).toMatch(/class="app-header"/);
      expect(html).toMatch(/<h1>.*Todo.*<\/h1>/i);
    });

    it("has an input section for adding todos", () => {
      expect(html).toMatch(/class="input-section"/);
      expect(html).toMatch(/id="todo-input"/);
      expect(html).toMatch(/id="add-todo-btn"/);
    });

    it("has a filter section with filter buttons", () => {
      expect(html).toMatch(/class="filter-section"/);
      expect(html).toMatch(/data-filter="all"/);
      expect(html).toMatch(/data-filter="active"/);
      expect(html).toMatch(/data-filter="completed"/);
    });

    it("has a list section for displaying todos", () => {
      expect(html).toMatch(/class="list-section"/);
      expect(html).toMatch(/id="todo-list"/);
      expect(html).toMatch(/<ul[^>]*id="todo-list"/);
    });

    it("has an empty state message", () => {
      expect(html).toMatch(/id="empty-state"/);
    });

    it("includes the necessary script and link tags", () => {
      expect(html).toMatch(/src="app.js"/);
      expect(html).toMatch(/href="styles.css"/);
    });
  });

  describe("App Module", () => {
    it("app.js is a valid JavaScript module", async () => {
      const m = await import(pathToFileURL(APP_JS_PATH).href);
      expect(m).toBeTruthy();
      expect(typeof m).toBe("object");
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
      expect(pkg.name).toBe("personal-todo-app");
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

  describe("Accessibility", () => {
    let html;

    beforeAll(() => {
      html = readFileSync(INDEX_HTML_PATH, "utf8");
    });

    it("has semantic HTML with sections", () => {
      const sectionMatches = html.match(/<section/g);
      expect(sectionMatches).toBeTruthy();
      expect(sectionMatches.length).toBeGreaterThanOrEqual(3);
    });

    it("has ARIA labels for interactive elements", () => {
      expect(html).toMatch(/aria-label/);
    });

    it("has ARIA roles for filter controls", () => {
      expect(html).toMatch(/role="group"/);
    });

    it("has proper form labels", () => {
      expect(html).toMatch(/for="todo-input"/);
    });
  });
});
