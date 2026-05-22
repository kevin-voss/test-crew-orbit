# Agent guide — monorepo

Canonical instructions for AI agents in this repository. Tool-specific files (e.g. `.cursor/rules/`) should stay short and point here instead of duplicating this content.

## Layout

- **Independent projects** at the repo root (`project-name/`). There is no root `package.json` or shared build.
- Before any task: `cd <project-name>` and read that folder’s `package.json` (scripts, dependencies).
- **Tests**: Vitest where a project defines `npm test` / `vitest.config.js`. HTML-only apps may have no tests.

## Shared conventions

- Detailed monorepo and per-project notes: [`.claude/rules.md`](.claude/rules.md) (other root projects; **`sql-learning-app/` is documented in this file**)
- Claude Code entry point: [`CLAUDE.md`](CLAUDE.md)

## Active focus: `pokedex/` (Crew Orbit `feature-pokedexbenny`)

Static HTML/CSS/JS Pokédex for national dex #1–#56 (weight, height, types, shiny sprites).

| Area | Choice |
|------|--------|
| UI | Vanilla JS (`app.js`), static `index.html` + `styles.css` |
| Data | `data/pokemon.json`; maintain via `scripts/validate-pokemon.mjs` / `scripts/generate-pokemon-data.mjs` |
| Assets | `assets/` sprites; `fetch` requires HTTP (see project README) |
| Tests | Vitest in `test/` (`vitest.config.js`, `test/setup-dom.mjs`) — run only when the user asks |

Do **not** add React, Vite, or bundlers unless explicitly requested. Cursor skills under `.cursor/skills/react` and `shadcn-ui` do not apply here.

### Also documented: `sql-learning-app/`

German-language SQL learning app for beginners (default when no project is named and work is not under `pokedex/`).

| Area | Choice |
|------|--------|
| UI | Vanilla JS (`app.js`, `src/views/`), static `index.html` + `styles.css` |
| SQL runtime | `sql.js` (in-browser SQLite) via `src/sqlRunner.js` |
| Data / flow | `src/curriculum.js`, `src/exerciseEngine.js`, `src/pathController.js`, `src/progressStore.js` |
| Tests | Vitest in `test/` — run only when the user asks |
| Persistence | `localStorage` key `sql-lern-app-progress-v1` (local only, no account) |

## Cursor

- **Always-on**: [`.cursor/rules/monorepo.mdc`](.cursor/rules/monorepo.mdc)
- **Path-scoped**: [`pokedex.mdc`](.cursor/rules/pokedex.mdc) (`pokedex/**`), [`sql-learning-app.mdc`](.cursor/rules/sql-learning-app.mdc) (`sql-learning-app/**`)
- **Skills**: [`.cursor/skills/react`](.cursor/skills/react), [`shadcn-ui`](.cursor/skills/shadcn-ui), [`typescript`](.cursor/skills/typescript) — other root projects only; skip for `pokedex/` and `sql-learning-app/` unless requested
- **Commands / hooks**: none configured

## Crew Orbit metadata

Worker output (plans, validate results) lives under **`/workspace/crew-orbit/<feature>/...`** — outside this clone. Do not commit `crew-orbit/` if it appears under the repo root (see `.gitignore`).
