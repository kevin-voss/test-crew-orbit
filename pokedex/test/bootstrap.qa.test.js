import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP_JS_PATH = join(ROOT, "app.js");
const POKEMON_JSON_PATH = join(ROOT, "data", "pokemon.json");

function loadPokemonJson() {
  return JSON.parse(readFileSync(POKEMON_JSON_PATH, "utf8"));
}

describe("QA — bootstrap resilience (non-acceptance)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("shows catalog error when fetch returns non-JSON body", async () => {
    // QA: malformed response must not leave perpetual Loading…
    const catalog = document.createElement("main");
    catalog.id = "pokedex-catalog";
    catalog.textContent = "Loading Pokédex…";
    document.body.replaceChildren(catalog);

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    const app = await import(
      `${pathToFileURL(APP_JS_PATH).href}?qa-malformed-json=${Date.now()}`,
    );
    await app.bootstrap(document);
    expect(catalog.querySelector(".catalog-error[role='alert']")).toBeTruthy();
    expect(catalog.textContent).toMatch(/could not load/i);
  });

  it("shows catalog error when JSON payload is an object, not an array", async () => {
    // QA: object payload must not throw uncaught or render zero cards silently
    const catalog = document.createElement("main");
    catalog.id = "pokedex-catalog";
    document.body.replaceChildren(catalog);

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ count: 56 }),
    });

    const app = await import(
      `${pathToFileURL(APP_JS_PATH).href}?qa-object-payload=${Date.now()}`,
    );
    await app.bootstrap(document);
    const hasError = catalog.querySelector(".catalog-error[role='alert']");
    const cards = catalog.querySelectorAll(".pokemon-card");
    expect(hasError || cards.length === 0).toBeTruthy();
    if (!hasError) {
      expect(
        catalog.querySelector(".catalog-empty, [role='alert']"),
      ).toBeTruthy();
    }
  });

  it("surfaces HTTP failure without leaving Loading placeholder text", async () => {
    // QA: negative path — failed fetch (offline / 404)
    const catalog = document.createElement("main");
    catalog.id = "pokedex-catalog";
    catalog.textContent = "Loading Pokédex…";
    document.body.replaceChildren(catalog);

    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => [],
    });

    const app = await import(
      `${pathToFileURL(APP_JS_PATH).href}?qa-http-404=${Date.now()}`,
    );
    await app.bootstrap(document);
    expect(catalog.textContent).not.toBe("Loading Pokédex…");
    expect(catalog.querySelector(".catalog-error[role='alert']")).toBeTruthy();
  });

  it("handles concurrent bootstrap calls without duplicating the full catalog", async () => {
    // QA: race — double bootstrap on DOMContentLoaded + manual call
    const list = loadPokemonJson();
    const catalog = document.createElement("main");
    catalog.id = "pokedex-catalog";
    document.body.replaceChildren(catalog);

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => list,
    });

    const app = await import(
      `${pathToFileURL(APP_JS_PATH).href}?qa-concurrent=${Date.now()}`,
    );
    await Promise.all([app.bootstrap(document), app.bootstrap(document)]);
    expect(catalog.querySelectorAll(".pokemon-card")).toHaveLength(56);
  });

  it("applies brokenSprite query only to normal sprite for the targeted dex", () => {
    // QA: fuzz query string — shiny path must stay intact when breaking normal
    const dom = new JSDOM("", { url: "http://localhost/?brokenSprite=25" });
    const prevWindow = globalThis.window;
    globalThis.window = dom.window;
    const pikachu = {
      nationalDexNumber: 25,
      name: "Pikachu",
      weight: 6,
      height: 0.4,
      types: ["Electric"],
      spriteNormal: "assets/sprites/25.png",
      spriteShiny: "assets/sprites/25-shiny.png",
    };
    return import(pathToFileURL(APP_JS_PATH).href).then((app) => {
      const card = app.createPokemonCard(pikachu);
      const normal = card.querySelector("img.sprite-normal");
      const shiny = card.querySelector("img.sprite-shiny");
      expect(normal.getAttribute("src")).toMatch(/__missing__/);
      expect(shiny.getAttribute("src")).toMatch(/25-shiny/);
      globalThis.window = prevWindow;
    });
  });
});
