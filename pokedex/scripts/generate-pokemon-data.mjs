/**
 * One-off generator: fetches dex #1–#56 from PokeAPI and writes pokemon.json + sprites.
 * Run: node scripts/generate-pokemon-data.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SPRITES_DIR = join(ROOT, "assets", "sprites");
const JSON_PATH = join(ROOT, "data", "pokemon.json");

const TYPE_MAP = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy",
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
}

mkdirSync(SPRITES_DIR, { recursive: true });
mkdirSync(join(ROOT, "data"), { recursive: true });

const roster = [];

for (let id = 1; id <= 56; id++) {
  const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const types = data.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => TYPE_MAP[t.type.name] ?? t.type.name);

  const normalUrl = data.sprites.front_default;
  const shinyUrl = data.sprites.front_shiny ?? data.sprites.other?.["official-artwork"]?.front_shiny;

  const spriteNormal = `assets/sprites/${id}.png`;
  const spriteShiny = `assets/sprites/${id}-shiny.png`;

  if (normalUrl) await downloadFile(normalUrl, join(ROOT, spriteNormal));
  if (shinyUrl) await downloadFile(shinyUrl, join(ROOT, spriteShiny));

  roster.push({
    nationalDexNumber: id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1).replace(/-f$/, "♀").replace(/-m$/, "♂"),
    weight: data.weight / 10,
    height: data.height / 10,
    types,
    spriteNormal,
    spriteShiny,
  });

  // Nidoran special names from helpers
  if (id === 29) roster[roster.length - 1].name = "Nidoran♀";
  if (id === 32) roster[roster.length - 1].name = "Nidoran♂";

  console.log(`#${id} ${roster[roster.length - 1].name}`);
}

writeFileSync(JSON_PATH, JSON.stringify(roster, null, 2) + "\n");
console.log(`Wrote ${roster.length} entries to ${JSON_PATH}`);
