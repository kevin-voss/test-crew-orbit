import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NATIONAL_DEX_NAMES_1_56,
  CANONICAL_TYPE_NAMES,
  SPOT_CHECK_DEX,
  REQUIRED_POKEMON_KEYS,
} from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POKEMON_JSON_PATH = join(ROOT, "data", "pokemon.json");
const VALIDATE_SCRIPT_PATH = join(ROOT, "scripts", "validate-pokemon.mjs");

function loadPokemonJson() {
  const raw = readFileSync(POKEMON_JSON_PATH, "utf8");
  return JSON.parse(raw);
}

describe("Pokémon data bundle", () => {
  it("includes a validate-pokemon script for the 56-entry roster", () => {
    // covers AC-2
    expect(existsSync(VALIDATE_SCRIPT_PATH)).toBe(true);
  });

  it("stores exactly 56 Pokémon records in data/pokemon.json", () => {
    // covers AC-2
    const list = loadPokemonJson();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(56);
  });

  it("covers national dex numbers 1 through 56 in ascending order", () => {
    // covers AC-6
    const list = loadPokemonJson();
    const numbers = list.map((p) => p.nationalDexNumber);
    expect(numbers).toEqual([...Array(56)].map((_, i) => i + 1));
  });

  it("does not include any Pokémon with national dex number 57 or higher", () => {
    // covers AC-19
    const list = loadPokemonJson();
    expect(list.every((p) => p.nationalDexNumber <= 56)).toBe(true);
    expect(list.some((p) => p.nationalDexNumber >= 57)).toBe(false);
  });

  it("uses unique national dex numbers across all entries", () => {
    // covers AC-22
    const list = loadPokemonJson();
    const numbers = list.map((p) => p.nationalDexNumber);
    expect(new Set(numbers).size).toBe(56);
  });

  it("includes name and national dex number on every entry", () => {
    // covers AC-7
    const list = loadPokemonJson();
    for (const entry of list) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.nationalDexNumber).toBeGreaterThanOrEqual(1);
      expect(entry.nationalDexNumber).toBeLessThanOrEqual(56);
    }
  });

  it("maps roster names to the canonical first-56 national dex list", () => {
    // covers AC-6
    // covers AC-7
    const list = loadPokemonJson();
    const names = list.map((p) => p.name);
    expect(names).toEqual(NATIONAL_DEX_NAMES_1_56);
  });

  it("stores numeric weight on every entry for display with units", () => {
    // covers AC-8
    const list = loadPokemonJson();
    for (const entry of list) {
      expect(typeof entry.weight).toBe("number");
      expect(entry.weight).toBeGreaterThan(0);
    }
  });

  it("stores numeric height (size) on every entry for display with units", () => {
    // covers AC-9
    const list = loadPokemonJson();
    for (const entry of list) {
      expect(typeof entry.height).toBe("number");
      expect(entry.height).toBeGreaterThan(0);
    }
  });

  it("uses canonical English type names with one or two types per entry", () => {
    // covers AC-10
    const list = loadPokemonJson();
    for (const entry of list) {
      expect(Array.isArray(entry.types)).toBe(true);
      expect(entry.types.length).toBeGreaterThanOrEqual(1);
      expect(entry.types.length).toBeLessThanOrEqual(2);
      for (const typeName of entry.types) {
        expect(CANONICAL_TYPE_NAMES.has(typeName)).toBe(true);
      }
    }
  });

  it("lists both types for dual-type Pokémon such as Bulbasaur", () => {
    // covers AC-21
    const bulbasaur = loadPokemonJson().find((p) => p.nationalDexNumber === 1);
    expect(bulbasaur.types).toEqual(SPOT_CHECK_DEX[1].types);
  });

  it("includes normal and shiny sprite paths associated with each entry", () => {
    // covers AC-5
    // covers AC-11
    const list = loadPokemonJson();
    for (const entry of list) {
      for (const key of REQUIRED_POKEMON_KEYS) {
        expect(entry[key]).toBeDefined();
      }
      expect(entry.spriteNormal).toMatch(new RegExp(`${entry.nationalDexNumber}`));
      expect(entry.spriteShiny).toMatch(/shiny/i);
    }
  });

  describe("E2E spot-check species", () => {
    for (const [dex, expected] of Object.entries(SPOT_CHECK_DEX)) {
      it(`entry #${dex} is ${expected.name} with expected types`, () => {
        // covers AC-6
        // covers AC-10
        const entry = loadPokemonJson().find(
          (p) => p.nationalDexNumber === Number(dex),
        );
        expect(entry.name).toBe(expected.name);
        expect(entry.types).toEqual(expected.types);
      });
    }
  });
});
