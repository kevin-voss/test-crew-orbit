# Agent guidance (Cursor)

This repository is a **crew-orbit** coordination checkout: feature specs under `crew-orbit/` and implementation under `src/` (**TypeScript**, **React** (peer), **Zustand**, **Vitest** — see root `package.json`).

**Before coding**

- **Persisted market store:** `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md`.
- **GBM market engine:** `crew-orbit/feature-implement-gbm-market-engine/design/design-spec.md` (utility-only in `src/utils/marketEngine.ts`; no new UI here).
- **Market tick controller:** `crew-orbit/feature-add-market-tick-controller/design/design-spec.md` (single shell hook; bridge to store; panels do not own timers; no UI in tick modules).
- **Live ticker panel:** `crew-orbit/feature-build-live-ticker-panel/design/design-spec.md` (list semantics, spacing, flash behavior; panels consume `useMarketStore` only; **no** per-panel timers — tick shell only; see spec for styling).
- **Trading terminal:** `crew-orbit/feature-build-trading-terminal/design/design-spec.md` (semantic controls and a11y; Ivory Studio neutrals; `useMarketStore` + trade simulation; tick controller stays on the dashboard shell — **no** timers in the terminal).
- **Dynamic charts & analytics:** `crew-orbit/feature-render-dynamic-charts-and-analytics/design/design-spec.md` (Recharts; metrics in `src/analytics/`; panels consume `useMarketStore` only; **no** per-panel timers).
- Prefer **state-layer-only** changes in the store: no UI or presentation imports in the store module; consumers use `useMarketStore` (per requirements in `spec/` when present).

**Cursor**

- Project rules live in `.cursor/rules/` (`.mdc` files with YAML frontmatter). They align with this feature’s stack and boundaries; they are the source of detailed editing constraints for agents.

**Humans**

- Keep AGENTS.md short; expand process or stack detail in feature `plan/` / `spec/` or in rule files, not duplicate long prose here.
