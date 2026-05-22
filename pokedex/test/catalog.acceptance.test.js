import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { SPOT_CHECK_DEX } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POKEMON_JSON_PATH = join(ROOT, "data", "pokemon.json");
const APP_JS_PATH = join(ROOT, "app.js");

function loadPokemonJson() {
  return JSON.parse(readFileSync(POKEMON_JSON_PATH, "utf8"));
}

describe("Pokédex catalog rendering", () => {
  /** @type {typeof import("../app.js")} */
  let app;
  /** @type {HTMLElement} */
  let catalog;

  beforeAll(async () => {
    app = await import(pathToFileURL(APP_JS_PATH).href);
  });

  beforeEach(() => {
    catalog = document.createElement("main");
    catalog.id = "pokedex-catalog";
    document.body.replaceChildren(catalog);
  });

  it("exports renderCatalog to paint the visitor-facing catalog", () => {
    // covers AC-2
    expect(app.renderCatalog).toBeTypeOf("function");
  });

  it("exports createPokemonCard for a single catalog entry", () => {
    // covers AC-4
    expect(app.createPokemonCard).toBeTypeOf("function");
  });

  it("renders exactly 56 pokemon-card entries in national dex order", () => {
    // covers AC-2
    // covers AC-3
    // covers AC-6
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    const cards = catalog.querySelectorAll(".pokemon-card");
    expect(cards).toHaveLength(56);
    const dexOrder = [...cards].map((c) => Number(c.dataset.dex));
    expect(dexOrder).toEqual([...Array(56)].map((_, i) => i + 1));
  });

  it("shows weight, height, and types on the same card as name and dex number", () => {
    // covers AC-4
    // covers AC-7
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    for (const card of catalog.querySelectorAll(".pokemon-card")) {
      expect(card.textContent).toMatch(/weight/i);
      expect(card.textContent).toMatch(/height|size/i);
      expect(card.textContent).toMatch(/type/i);
      expect(card.querySelector(".pokemon-card__name, h2")).toBeTruthy();
      expect(card.textContent).toMatch(/#\d+/);
    }
  });

  it("labels weight, size (height), and types explicitly on each card", () => {
    // covers AC-16
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    for (const card of catalog.querySelectorAll(".pokemon-card")) {
      expect(card.textContent).toMatch(/\bWeight\b/i);
      expect(card.textContent).toMatch(/\b(Height|Size)\b/i);
      expect(card.textContent).toMatch(/\bType\(s\)\b/i);
    }
  });

  it("shows weight and height with numeric values and unit labels", () => {
    // covers AC-8
    // covers AC-9
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    for (const card of catalog.querySelectorAll(".pokemon-card")) {
      expect(card.textContent).toMatch(/\d+(\.\d+)?\s*kg/i);
      expect(card.textContent).toMatch(/\d+(\.\d+)?\s*m\b/i);
    }
  });

  it("renders canonical type names including both types for dual-type entries", () => {
    // covers AC-10
    // covers AC-21
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    const bulbasaur = catalog.querySelector('.pokemon-card[data-dex="1"]');
    expect(bulbasaur.textContent).toMatch(/Grass/i);
    expect(bulbasaur.textContent).toMatch(/Poison/i);
  });

  it("exposes a per-entry shiny control or visible shiny representation", () => {
    // covers AC-5
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    for (const card of catalog.querySelectorAll(".pokemon-card")) {
      const shinyImg = card.querySelector(
        'img.sprite-shiny, img[data-variant="shiny"], .sprite-shiny img',
      );
      const shinyToggle = card.querySelector(
        '.shiny-toggle, button[data-action="shiny"], [aria-label*="shiny" i]',
      );
      const shinyVisible =
        shinyImg && !shinyImg.hidden && shinyImg.getAttribute("hidden") === null;
      expect(shinyVisible || shinyToggle).toBeTruthy();
    }
  });

  it("keeps shiny assets and controls scoped to the matching card only", () => {
    // covers AC-11
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    for (const card of catalog.querySelectorAll(".pokemon-card")) {
      const dex = card.dataset.dex;
      const shinyBits = card.querySelectorAll(
        '.sprite-shiny, .shiny-toggle, img[data-variant="shiny"]',
      );
      for (const el of shinyBits) {
        expect(el.closest(".pokemon-card")?.dataset.dex).toBe(dex);
      }
    }
  });

  it("distinguishes normal and shiny appearances with labels or state text", () => {
    // covers AC-12
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    const sample = catalog.querySelector('.pokemon-card[data-dex="25"]');
    expect(sample.textContent).toMatch(/normal/i);
    expect(sample.textContent).toMatch(/shiny/i);
  });

  it("shows unavailable text instead of silently omitting missing scalar fields", () => {
    // covers AC-14
    const incomplete = {
      nationalDexNumber: 99,
      name: "Fixture",
      weight: null,
      height: undefined,
      types: [],
      spriteNormal: "assets/sprites/x.png",
      spriteShiny: "assets/sprites/x-shiny.png",
    };
    const card = app.createPokemonCard(incomplete);
    expect(card.textContent).toMatch(/unavailable/i);
  });

  it("shows a loading or placeholder state for async image presentation", () => {
    // covers AC-13
    const pikachu = loadPokemonJson().find((p) => p.nationalDexNumber === 25);
    const card = app.createPokemonCard(pikachu);
    const loading = card.querySelector(
      '.sprite-loading, [data-state="loading"], .pokemon-card__sprites [aria-busy="true"]',
    );
    const img = card.querySelector("img");
    expect(loading || img?.getAttribute("loading") === "lazy").toBeTruthy();
  });

  it("documents image failure handling that preserves stats and shows a message", () => {
    // covers AC-15
    expect(app.handleSpriteError).toBeTypeOf("function");
    const pikachu = loadPokemonJson().find((p) => p.nationalDexNumber === 25);
    const card = app.createPokemonCard(pikachu);
    const img = card.querySelector(
      'img.sprite-normal, img[data-variant="normal"]',
    );
    expect(img).toBeTruthy();
    app.handleSpriteError(img);
    expect(card.textContent).toMatch(/weight/i);
    expect(card.textContent).toMatch(/unavailable|error|failed/i);
  });

  it("isolates shiny toggle state per entry without affecting other cards", () => {
    // covers AC-23
    expect(app.wireShinyToggle).toBeTypeOf("function");
    const list = loadPokemonJson();
    app.renderCatalog(catalog, list);
    const card1 = catalog.querySelector('.pokemon-card[data-dex="1"]');
    const card25 = catalog.querySelector('.pokemon-card[data-dex="25"]');
    const card56 = catalog.querySelector('.pokemon-card[data-dex="56"]');
    app.wireShinyToggle(card25, list[24]);
    const toggle = card25.querySelector(".shiny-toggle, button[data-action='shiny']");
    toggle?.click();
    expect(card25.classList.contains("is-shiny-visible")).toBe(true);
    expect(card1.classList.contains("is-shiny-visible")).toBe(false);
    expect(card56.classList.contains("is-shiny-visible")).toBe(false);
  });
});

describe("Pokédex static shell integration", () => {
  it("bootstraps the catalog from index.html without a sign-in gate", async () => {
    // covers AC-1
    // covers AC-3
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    const dom = new JSDOM(html, {
      url: "http://localhost/",
      runScripts: "outside-only",
      resources: "usable",
    });
    const { window } = dom;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => loadPokemonJson(),
    });
    const catalogEl = window.document.querySelector("#pokedex-catalog");
    expect(catalogEl).toBeTruthy();
    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    const prevEvent = globalThis.Event;
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Event = window.Event;
    await import(
      `${pathToFileURL(APP_JS_PATH).href}?shell=${Date.now()}`,
    );
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.Event = prevEvent;
    await new Promise((r) => setTimeout(r, 0));
    const cards = catalogEl.querySelectorAll(".pokemon-card");
    expect(cards.length).toBe(56);
  });
});

describe("E2E spot-check cards", () => {
  /** @type {typeof import("../app.js")} */
  let app;

  beforeAll(async () => {
    app = await import(pathToFileURL(APP_JS_PATH).href);
  });

  for (const [dex, expected] of Object.entries(SPOT_CHECK_DEX)) {
    it(`card #${dex} (${expected.name}) shows stats and shiny access`, () => {
      // covers AC-4
      // covers AC-5
      const list = loadPokemonJson();
      const catalog = document.createElement("main");
      app.renderCatalog(catalog, list);
      const card = catalog.querySelector(`.pokemon-card[data-dex="${dex}"]`);
      expect(card.textContent).toContain(expected.name);
      expect(card.textContent).toMatch(/kg/i);
      expect(card.textContent).toMatch(/\bm\b/);
      for (const typeName of expected.types) {
        expect(card.textContent).toContain(typeName);
      }
      const shinyControl = card.querySelector(
        '.shiny-toggle, img.sprite-shiny, img[data-variant="shiny"]',
      );
      expect(shinyControl).toBeTruthy();
    });
  }
});
