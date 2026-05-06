# AI config setup (Cursor)

**Date:** 2026-05-06  
**Scope:** Cursor `.cursor/rules/` + root `AGENTS.md` only; shallow stack from `package.json` (TypeScript ESM, Zustand, React peer/dev, Vitest).

## Files touched

| Path | Change |
|------|--------|
| `AGENTS.md` | Added a **Before coding** bullet linking `crew-orbit/feature-build-live-ticker-panel/design/design-spec.md`, with constraints: panels use `useMarketStore` only, no per-panel timers, align with existing inline-style / flash patterns (detail stays in the feature spec). |
| `.cursor/rules/feature-market-store.mdc` | Extended **description** frontmatter; added the live-ticker spec to the **Specs** list with `TickerPanel` / `LiveTickerPanel` / `marketDashboard/` scope; new **Live ticker panel (UI)** subsection (spec compliance, no Tailwind/Radix/shadcn in this sandbox, store-driven panels, no extra tick loops). |

## Not changed (deliberate)

- **`.gitignore`:** No edit—no generated AI artifact paths identified as required here.
- **New `.mdc` files / `commands/` / `hooks/` / `skills/`:** Not created; repo only had `rules/feature-market-store.mdc`. Extending the single rule avoids duplication with `AGENTS.md`.
- **Tests / build / install:** Not run (per task prohibitions).

## Follow-ups for humans

- If the team adds more Cursor automation (commands, hooks), mirror boundaries from `AGENTS.md` + this rule rather than duplicating long prose.
- If `LiveTickerPanel` vs `TickerPanel` consolidation happens, update the **read before** paths in the rule’s spec list to match the canonical file names only.

## Count

**2** files under allowed paths (`AGENTS.md`, one `.mdc` rule). Summary lives outside those paths as requested.
