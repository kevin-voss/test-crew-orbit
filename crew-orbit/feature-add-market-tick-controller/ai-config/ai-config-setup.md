# AI config setup (Cursor)

**Date:** 2026-05-06  
**Scope:** Cursor rules + shared `AGENTS.md` only; no installs, builds, tests, or app-source edits.

## Files touched

| Path | Change |
|------|--------|
| `.cursor/rules/feature-market-store.mdc` | Extended frontmatter description; **market tick controller** spec link; **Tick controller** boundary (single `applyMarketTick` source, no duplicate timers from panels, one mount at shell, rehydration alignment); pointers to `src/market/` tick modules. |
| `AGENTS.md` | **Before coding** bullet linking `crew-orbit/feature-add-market-tick-controller/design/design-spec.md`. |
| This file | Summary for humans. |

**Count:** 3 files (≤ budget where applicable).

## Not changed

- **`.gitignore`:** No new generated paths beyond existing `node_modules/` / `dist/`.
- **Extra `.cursor/commands`, `hooks`, `skills`:** Not added unless the team adopts them globally.

## Follow-ups for humans

- If **market tick** work grows large, consider a dedicated `.mdc` with tighter `globs` (e.g. `src/market/**`).
- After host-app merge, refresh **AGENTS.md** / rules for the real UI stack and hydration patterns.
