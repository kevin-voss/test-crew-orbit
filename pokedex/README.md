# Pokédex (first 56)

Static HTML/CSS/JS Pokédex for national dex #1–#56: weight, height, types, and per-entry shiny sprites.

## Run locally

`fetch` requires a local HTTP server (not `file://`):

```bash
cd pokedex
python3 -m http.server 8765
```

Open http://localhost:8765/

## Data

- `data/pokemon.json` — 56 entries
- Validate: `node scripts/validate-pokemon.mjs`
- Regenerate from PokeAPI: `node scripts/generate-pokemon-data.mjs`

## Tests

```bash
npm test
```

## Dev: broken sprite

Append `?brokenSprite=25` to force Pikachu’s normal sprite to fail (error fallback).
