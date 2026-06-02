# Agent guide — monorepo

Canonical instructions for AI agents in this repository. Tool-specific files (e.g. `.cursor/rules/`) should stay short and point here instead of duplicating this content.

## Layout

- **Independent projects** at the repo root (`project-name/`). There is no root `package.json` or shared build.
- Before any task: `cd <project-name>` and read that folder’s `package.json` (scripts, dependencies).
- **Tests**: Vitest where a project defines `npm test` / `vitest.config.js`. HTML-only apps may have no tests.

## Shared conventions

- **Project discovery**: `cd <project-name>` at repo root, then read that folder’s `package.json` (scripts, deps) and README before editing.
- **Other root projects** (e.g. `habit-tracker/`, `weather-dashboard/`, `live-streaming-chat/`): catalog and stack notes in [`.claude/rules.md`](.claude/rules.md). Prefer matching each project’s existing patterns — do not assume `chatbot-app/` stack.
- Per-project detail for **`pokedex/`** and **`sql-learning-app/`** lives in this file (not the `.claude/rules.md` catalog).
- Claude Code entry point: [`CLAUDE.md`](CLAUDE.md)

## Active focus: `chatbot-app/` (Crew Orbit `feature-chatbot`)

Browser LLM chat: React + Vite frontend, Express API backend (keys stay server-side).

| Area | Choice |
|------|--------|
| Layout | `chatbot-app/frontend/` and `chatbot-app/backend/` — separate `package.json` each; `cd` into the side you change |
| UI | React 18 (`frontend/src/`), Vite dev/build; plain CSS in `frontend/src/index.css` |
| API | Express (`backend/server.js`); `OPENAI_API_KEY` in `backend/.env` only |
| History | Session-only (in-memory until refresh); see project README |
| Tests | Vitest in `frontend/` and `backend/` — run only when the user asks |

Use Cursor skills `.cursor/skills/react` and `typescript` here. `shadcn-ui` / `tailwind-css` only if the user adds that stack.

### Also documented: `pokedex/`

Static HTML/CSS/JS Pokédex for national dex #1–#56 (weight, height, types, shiny sprites).

| Area | Choice |
|------|--------|
| UI | Vanilla JS (`app.js`), static `index.html` + `styles.css` |
| Data | `data/pokemon.json`; maintain via `scripts/validate-pokemon.mjs` / `scripts/generate-pokemon-data.mjs` |
| Assets | `assets/` sprites; `fetch` requires HTTP (see project README) |
| Tests | Vitest in `test/` (`vitest.config.js`, `test/setup-dom.mjs`) — run only when the user asks |

Do **not** add React, Vite, or bundlers unless explicitly requested. Cursor skills under `.cursor/skills/react` and `shadcn-ui` do not apply here.

### Also documented: `sql-learning-app/`

German-language SQL learning app for beginners.

| Area | Choice |
|------|--------|
| UI | Vanilla JS (`app.js`, `src/views/`), static `index.html` + `styles.css` |
| SQL runtime | `sql.js` (in-browser SQLite) via `src/sqlRunner.js` |
| Data / flow | `src/curriculum.js`, `src/exerciseEngine.js`, `src/pathController.js`, `src/progressStore.js` |
| Tests | Vitest in `test/` — run only when the user asks |
| Persistence | `localStorage` key `sql-lern-app-progress-v1` (local only, no account) |

## Cursor

- **Always-on**: [`.cursor/rules/monorepo.mdc`](.cursor/rules/monorepo.mdc)
- **Path-scoped**: [`chatbot-app.mdc`](.cursor/rules/chatbot-app.mdc) (`chatbot-app/**`), [`pokedex.mdc`](.cursor/rules/pokedex.mdc) (`pokedex/**`), [`sql-learning-app.mdc`](.cursor/rules/sql-learning-app.mdc) (`sql-learning-app/**`)
- **Skills**: [`react`](.cursor/skills/react), [`typescript`](.cursor/skills/typescript) for `chatbot-app/` and other React root projects; [`design-system`](.cursor/skills/design-system) for UI polish; [`shadcn-ui`](.cursor/skills/shadcn-ui) / [`tailwind-css`](.cursor/skills/tailwind-css) when that stack is in use; skip React/TS/shadcn for `pokedex/` and `sql-learning-app/` unless requested; [`caveman`](.cursor/skills/caveman) only when the user asks for terse output
- **Commands / hooks**: none configured

## Crew Orbit metadata

Worker output (plans, validate results) lives under **`/workspace/crew-orbit/<feature>/...`** — outside this clone. Do not commit `crew-orbit/` if it appears under the repo root (see `.gitignore`).
