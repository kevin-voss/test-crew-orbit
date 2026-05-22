import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const JSON_PATH = join(ROOT, "data", "pokemon.json");

const CANONICAL_TYPES = new Set([
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison",
  "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
]);

const REQUIRED_KEYS = [
  "nationalDexNumber",
  "name",
  "weight",
  "height",
  "types",
  "spriteNormal",
  "spriteShiny",
];

const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));

function fail(msg) {
  console.error(`validate-pokemon: ${msg}`);
  process.exit(1);
}

if (!Array.isArray(data)) fail("data must be an array");
if (data.length !== 56) fail(`expected 56 entries, got ${data.length}`);

const numbers = data.map((p) => p.nationalDexNumber);
if (numbers.some((n) => n < 1 || n > 56)) fail("nationalDexNumber must be 1–56");
if (new Set(numbers).size !== 56) fail("duplicate nationalDexNumber values");
const sorted = [...numbers].sort((a, b) => a - b);
for (let i = 0; i < 56; i++) {
  if (sorted[i] !== i + 1) fail(`missing dex number ${i + 1}`);
}

for (const entry of data) {
  for (const key of REQUIRED_KEYS) {
    if (entry[key] === undefined) fail(`entry #${entry.nationalDexNumber} missing ${key}`);
  }
  if (typeof entry.weight !== "number" || entry.weight <= 0) {
    fail(`entry #${entry.nationalDexNumber} invalid weight`);
  }
  if (typeof entry.height !== "number" || entry.height <= 0) {
    fail(`entry #${entry.nationalDexNumber} invalid height`);
  }
  if (!Array.isArray(entry.types) || entry.types.length < 1 || entry.types.length > 2) {
    fail(`entry #${entry.nationalDexNumber} invalid types`);
  }
  for (const t of entry.types) {
    if (!CANONICAL_TYPES.has(t)) fail(`entry #${entry.nationalDexNumber} unknown type ${t}`);
  }
  if (!String(entry.spriteNormal).includes(String(entry.nationalDexNumber))) {
    fail(`entry #${entry.nationalDexNumber} spriteNormal path must include dex number`);
  }
  if (!/shiny/i.test(entry.spriteShiny)) fail(`entry #${entry.nationalDexNumber} spriteShiny must reference shiny`);
}

const bulbasaur = data.find((p) => p.nationalDexNumber === 1);
if (!bulbasaur || bulbasaur.types.join() !== "Grass,Poison") {
  fail("Bulbasaur (#1) must be Grass and Poison");
}

console.log("validate-pokemon: OK (56 entries, dex 1–56)");
