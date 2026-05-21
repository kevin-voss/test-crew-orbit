# Agent guide — monorepo

Canonical instructions for AI agents in this repository. Tool-specific files (e.g. `.cursor/rules/`) should stay short and point here instead of duplicating this content.

## Layout

- **Independent projects** at the repo root (`project-name/`). There is no root `package.json` or shared build.
- Before any task: `cd <project-name>` and read that folder’s `package.json` (scripts, dependencies).
- **Tests**: Vitest where a project defines `npm test` / `vitest.config.js`. HTML-only apps may have no tests.

## Shared conventions

- Detailed monorepo and per-project notes: [`.claude/rules.md`](.claude/rules.md)
- Claude Code entry point: [`CLAUDE.md`](CLAUDE.md)

## Active focus: `sql-learning-app/`

German-language SQL learning app for beginners.

| Area | Choice |
|------|--------|
| UI | Vanilla JS (`app.js`, `src/views/`), static `index.html` + `styles.css` |
| SQL runtime | `sql.js` (in-browser SQLite) via `src/sqlRunner.js` |
| Data / flow | `src/curriculum.js`, `src/exerciseEngine.js`, `src/pathController.js`, `src/progressStore.js` |
| Tests | Vitest in `test/` — run only when the user asks |
| Persistence | `localStorage` key `sql-lern-app-progress-v1` (local only, no account) |

Do **not** add React, Vite, or bundlers to this project unless explicitly requested. Cursor skills under `.cursor/skills/react` and `shadcn-ui` do not apply here.

## Cursor

- **Always-on**: [`.cursor/rules/monorepo.mdc`](.cursor/rules/monorepo.mdc)
- **Path-scoped** (`sql-learning-app/**`): [`.cursor/rules/sql-learning-app.mdc`](.cursor/rules/sql-learning-app.mdc)
- **Skills**: [`.cursor/skills/react`](.cursor/skills/react), [`shadcn-ui`](.cursor/skills/shadcn-ui), [`typescript`](.cursor/skills/typescript) — other projects only; skip for `sql-learning-app/` unless requested
- **Commands / hooks**: none configured

## Crew Orbit metadata

Worker output (plans, validate results) lives under `/workspace/crew-orbit/` — **not** in this git repo. Do not commit `crew-orbit/` (see `.gitignore`).
