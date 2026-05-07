import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = join(__dirname, "..", "index.html");
const APP_JS_PATH = join(__dirname, "..", "app.js");
const STYLES_CSS_PATH = join(__dirname, "..", "styles.css");
const PACKAGE_JSON_PATH = join(__dirname, "..", "package.json");

describe("Weather Dashboard Shell", () => {
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

    it("contains the main dashboard container", () => {
      expect(html).toMatch(/class="dashboard"/);
    });

    it("includes the dashboard header section", () => {
      expect(html).toMatch(/class="dashboard-header"/);
      expect(html).toMatch(/<h1>.*[Ww]eather.*<\/h1>/i);
    });

    it("has a city search input section", () => {
      expect(html).toMatch(/class="search-section"/);
      expect(html).toMatch(/id="city-input"/);
      expect(html).toMatch(/id="search-btn"/);
    });

    it("has a loading state section", () => {
      expect(html).toMatch(/class="loading-section"/);
      expect(html).toMatch(/id="loading-state"/);
    });

    it("has an error state section", () => {
      expect(html).toMatch(/class="error-section"/);
      expect(html).toMatch(/id="error-state"/);
    });

    it("has a current weather display section", () => {
      expect(html).toMatch(/class="weather-section"/);
      expect(html).toMatch(/id="current-weather"/);
    });

    it("has a forecast cards section", () => {
      expect(html).toMatch(/class="forecast-section"/);
      expect(html).toMatch(/id="forecast-cards"/);
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

    it("exports a createWeatherDashboard function", async () => {
      const m = await import(pathToFileURL(APP_JS_PATH).href);
      expect(m.createWeatherDashboard).toBeTypeOf("function");
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
      expect(pkg.name).toBe("weather-dashboard");
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

  describe("Dashboard State Management", () => {
    let createWeatherDashboard;

    beforeAll(async () => {
      const m = await import("../app.js");
      createWeatherDashboard = m.createWeatherDashboard;
    });

    it("creates a dashboard instance with initial state", () => {
      const dashboard = createWeatherDashboard();
      expect(dashboard).toBeTruthy();
      expect(typeof dashboard).toBe("object");
    });

    it("initializes with idle state (no search run)", () => {
      const dashboard = createWeatherDashboard();
      expect(dashboard.getState()).toEqual({
        searchTerm: "",
        state: "idle",
        data: null,
        error: null,
      });
    });

    it("can update search term", () => {
      const dashboard = createWeatherDashboard();
      dashboard.setSearchTerm("New York");
      const state = dashboard.getState();
      expect(state.searchTerm).toBe("New York");
    });

    it("can transition to loading state", () => {
      const dashboard = createWeatherDashboard();
      dashboard.setLoading();
      expect(dashboard.getState().state).toBe("loading");
    });

    it("can transition to success state with data", () => {
      const dashboard = createWeatherDashboard();
      const mockData = {
        city: "New York",
        temperature: 72,
        condition: "Sunny",
      };
      dashboard.setSuccess(mockData);
      const state = dashboard.getState();
      expect(state.state).toBe("success");
      expect(state.data).toEqual(mockData);
    });

    it("can transition to error state with message", () => {
      const dashboard = createWeatherDashboard();
      dashboard.setError("City not found");
      const state = dashboard.getState();
      expect(state.state).toBe("error");
      expect(state.error).toBe("City not found");
    });

    it("clears state on reset", () => {
      const dashboard = createWeatherDashboard();
      dashboard.setSearchTerm("London");
      dashboard.setLoading();
      dashboard.reset();
      expect(dashboard.getState()).toEqual({
        searchTerm: "",
        state: "idle",
        data: null,
        error: null,
      });
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
      expect(sectionMatches.length).toBeGreaterThanOrEqual(4);
    });

    it("has a proper heading structure", () => {
      expect(html).toMatch(/<h1/);
    });

    it("has ARIA labels for interactive elements", () => {
      expect(html).toMatch(/aria-label/);
    });

    it("has proper form labels", () => {
      expect(html).toMatch(/for="city-input"/);
    });
  });
});
