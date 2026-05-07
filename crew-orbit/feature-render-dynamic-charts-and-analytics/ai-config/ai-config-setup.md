# AI config setup (Cursor) — dynamic charts & analytics

## Files touched (3)

| Path | Change |
|------|--------|
| `.cursor/rules/feature-market-store.mdc` | Extended scope in frontmatter/title to include **Recharts / dynamic charts & analytics**. Added **spec bullet** for `crew-orbit/feature-render-dynamic-charts-and-analytics/design/design-spec.md` and a short **“Dynamic charts & analytics (Recharts)”** section (library choice, no timers in chart files, analytics math in `src/analytics/` not the store, `chartConstants` + spec tokens/a11y/motion). |
| Root `AGENTS.md` | Added **Before coding** bullet linking the same design spec and restating panel-only `useMarketStore` + no per-panel timers. |
| This file | Session summary for humans. |

## Not changed

- **`.gitignore`** — not updated; `crew-orbit/` holds canonical specs and should stay versioned. No generated AI artifact pattern required a new ignore rule here.
- **No** new `.cursor/commands/`, `hooks/`, or `skills/` — the repo only had `.cursor/rules/feature-market-store.mdc`; kept the footprint small.

## Follow-ups for humans

- If you split rules later (e.g. a dedicated `feature-charts.mdc` with tighter globs on `marketDashboard/*Chart*` and `src/analytics/`), keep **one** place that states the tick-shell boundary so it is not duplicated inconsistently.
- After merging into a host app, repeat the **design-token** note already in AGENTS/rules (remap neutrals to host tokens without changing store data contracts).
