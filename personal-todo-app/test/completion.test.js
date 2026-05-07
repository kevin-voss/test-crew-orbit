import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JS_PATH = join(__dirname, "..", "app.js");
const STYLES_CSS_PATH = join(__dirname, "..", "styles.css");

describe("Todo Completion", () => {
  let appJs;
  let css;

  beforeAll(() => {
    appJs = readFileSync(APP_JS_PATH, "utf8");
    css = readFileSync(STYLES_CSS_PATH, "utf8");
  });

  describe("Data Model", () => {
    it("todo typedef declares completed as a boolean field", () => {
      expect(appJs).toMatch(/completed:\s*boolean/);
    });

    it("new todos are initialised with completed: false", () => {
      expect(appJs).toMatch(/completed:\s*false/);
    });
  });

  describe("Toggle Logic", () => {
    it("checkbox click sets completed from checkbox.checked", () => {
      expect(appJs).toMatch(/todo\.completed\s*=\s*checkbox\.checked/);
    });

    it("state is saved to storage after toggling", () => {
      // saveTodos must be called at least in the toggle branch
      const toggleSection = appJs.slice(appJs.indexOf("if (checkbox)"));
      expect(toggleSection).toMatch(/saveTodos\s*\(/);
    });

    it("list is re-rendered after toggling", () => {
      const toggleSection = appJs.slice(appJs.indexOf("if (checkbox)"));
      expect(toggleSection).toMatch(/renderTodos\s*\(/);
    });
  });

  describe("Rendering", () => {
    it("completed todos receive the completed CSS class on their text", () => {
      expect(appJs).toMatch(/todo\.completed.*[`'"]completed[`'"]/);
    });

    it("completed todos have the checkbox checked attribute", () => {
      // Template should include 'checked' when todo.completed is truthy
      expect(appJs).toMatch(/todo\.completed[\s\S]{0,60}checked/);
    });

    it("aria-label reflects completion state", () => {
      expect(appJs).toMatch(/aria-label.*incomplete.*complete|aria-label.*complete.*incomplete/i);
    });
  });

  describe("Styles", () => {
    it("completed todo text has line-through decoration", () => {
      expect(css).toMatch(/\.todo-text\.completed[\s\S]*?text-decoration:\s*line-through/);
    });

    it("completed todo text has a muted colour", () => {
      expect(css).toMatch(/\.todo-text\.completed[\s\S]*?color:/);
    });
  });
});
