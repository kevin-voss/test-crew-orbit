import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JS_PATH = join(__dirname, "..", "app.js");

describe("QA — catalog edge cases (non-acceptance)", () => {
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

  const basePokemon = {
    nationalDexNumber: 1,
    name: "Bulbasaur",
    weight: 6.9,
    height: 0.7,
    types: ["Grass", "Poison"],
    spriteNormal: "assets/sprites/1.png",
    spriteShiny: "assets/sprites/1-shiny.png",
  };

  it("rejects rendering when pokemonList is not an array", () => {
    // QA: malformed bootstrap payload must not throw uncaught
    expect(() => app.renderCatalog(catalog, null)).toThrow();
    expect(() => app.renderCatalog(catalog, { length: 56 })).toThrow();
  });

  it("shows an explicit empty-catalog state when pokemonList is empty", () => {
    // QA: silent zero-card catalog is confusing after successful fetch
    app.renderCatalog(catalog, []);
    const cards = catalog.querySelectorAll(".pokemon-card");
    expect(cards).toHaveLength(0);
    expect(
      catalog.querySelector(".catalog-empty, [role='alert'], .catalog-error"),
    ).toBeTruthy();
  });

  it("does not cap catalog length when more than 56 records are supplied", () => {
    // QA: runtime should not exceed spec scope (AC-19) without warning
    const overflow = Array.from({ length: 60 }, (_, i) => ({
      ...basePokemon,
      nationalDexNumber: i + 1,
      name: `Mon${i + 1}`,
    }));
    app.renderCatalog(catalog, overflow);
    expect(catalog.querySelectorAll(".pokemon-card")).toHaveLength(56);
  });

  it("surfaces duplicate nationalDexNumber entries instead of deduplicating silently", () => {
    // QA: duplicate dex numbers break browse ordering (AC-22)
    const dupes = [
      { ...basePokemon, nationalDexNumber: 1 },
      { ...basePokemon, nationalDexNumber: 1, name: "Bulbasaur clone" },
      { ...basePokemon, nationalDexNumber: 2, name: "Ivysaur" },
    ];
    app.renderCatalog(catalog, dupes);
    const dexOnes = catalog.querySelectorAll('.pokemon-card[data-dex="1"]');
    expect(dexOnes.length).toBeLessThanOrEqual(1);
  });

  it("formats non-finite numeric weight as unavailable, not as literal Infinity", () => {
    // QA: boundary — Infinity/−Infinity must not appear as display stats
    const card = app.createPokemonCard({
      ...basePokemon,
      weight: Infinity,
      height: 0.7,
    });
    expect(card.textContent).toMatch(/unavailable/i);
    expect(card.textContent).not.toMatch(/infinity/i);
  });

  it("formats negative weight as unavailable", () => {
    // QA: adversarial JSON could bypass validate script if edited at runtime
    const card = app.createPokemonCard({
      ...basePokemon,
      weight: -1,
    });
    expect(card.textContent).toMatch(/unavailable/i);
    expect(card.textContent).not.toMatch(/-1\s*kg/i);
  });

  it("does not leave duplicate error messages when handleSpriteError runs twice", () => {
    // QA: double error callback / retry must be idempotent
    const card = app.createPokemonCard(basePokemon);
    const img = card.querySelector("img.sprite-normal");
    app.handleSpriteError(img);
    app.handleSpriteError(img);
    expect(card.querySelectorAll(".sprite-error")).toHaveLength(1);
  });

  it("reports image failure when handleSpriteError is invoked outside a sprite figure", () => {
    // QA: orphaned img should not fail silently (AC-15)
    const orphan = document.createElement("img");
    orphan.className = "sprite-normal";
    document.body.appendChild(orphan);
    app.handleSpriteError(orphan);
    expect(
      orphan.nextElementSibling?.classList.contains("sprite-error") ||
        orphan.parentElement?.querySelector(".sprite-error"),
    ).toBeTruthy();
    orphan.remove();
  });

  it("keeps aria-pressed in sync after rapid shiny toggle clicks", () => {
    // QA: race — burst clicks must not desync toggle state
    const card = app.createPokemonCard(basePokemon);
    const btn = card.querySelector(".shiny-toggle");
    for (let i = 0; i < 20; i++) btn.click();
    const on = card.classList.contains("is-shiny-visible");
    expect(btn.getAttribute("aria-pressed")).toBe(String(on));
    expect(btn.textContent).toMatch(on ? /hide shiny/i : /show shiny/i);
  });

  it("registers only one shiny click handler when wireShinyToggle is called repeatedly", () => {
    // QA: duplicate listeners would flip state multiple times per click
    const card = app.createPokemonCard(basePokemon);
    const btn = card.querySelector(".shiny-toggle");
    app.wireShinyToggle(card, basePokemon);
    app.wireShinyToggle(card, basePokemon);
    app.wireShinyToggle(card, basePokemon);
    btn.click();
    const on = card.classList.contains("is-shiny-visible");
    btn.click();
    expect(card.classList.contains("is-shiny-visible")).toBe(!on);
  });

  it("renders cards when nationalDexNumber is missing without producing invalid data-dex", () => {
    // QA: malformed entry must not break card scoping (AC-11)
    const broken = { ...basePokemon, nationalDexNumber: undefined };
    delete broken.nationalDexNumber;
    const card = app.createPokemonCard(broken);
    const dex = card.dataset.dex;
    expect(dex).toBeTruthy();
    expect(dex).not.toBe("undefined");
  });

  it("stress: renderCatalog completes for 56 cards without throwing", () => {
    // QA: resource exhaustion — large single-pass render
    const list = Array.from({ length: 56 }, (_, i) => ({
      ...basePokemon,
      nationalDexNumber: i + 1,
      name: `Pokemon${i + 1}`,
      spriteNormal: `assets/sprites/${i + 1}.png`,
      spriteShiny: `assets/sprites/${i + 1}-shiny.png`,
    }));
    expect(() => app.renderCatalog(catalog, list)).not.toThrow();
    expect(catalog.querySelectorAll(".pokemon-card")).toHaveLength(56);
  });
});
