# AI config setup (Cursor)

**Date:** 2026-05-06  
**Scope:** Cursor project rules + shared agent doc only (no installs, tests, or builds).

## Files touched

| Path | Change |
|------|--------|
| `.cursor/rules/feature-market-store.mdc` | Extended frontmatter description; added **market tick controller** spec link and file pointers; added **Tick controller** boundary (single `applyMarketTick` loop, no duplicate timers/engine from panels, one mount at dashboard shell, rehydration alignment). |
| `AGENTS.md` | Added **Before coding** bullet linking `crew-orbit/feature-add-market-tick-controller/design/design-spec.md` with a one-line module role note. |

**Count:** 2 files under allowed paths (≤3 budget).

## Not changed

- **`.gitignore`:** No AI-only generated paths required ignoring beyond existing `node_modules/` / `dist/`.
- **New rule files / `.cursor/commands|hooks|skills`:** Repo only used `.cursor/rules/*.mdc`; no new directories.

## Follow-ups for humans

- If **market tick** work grows large, consider splitting a dedicated `.mdc` with tighter `globs` (e.g. `src/market/**`) instead of expanding the monolithic market rule further.
- After merging into a host app, refresh **AGENTS.md** / rules if UI stack or hydration patterns differ.
