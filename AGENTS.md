# Agent guidance (Cursor)

This repository is a **crew-orbit** coordination checkout: feature specs under `crew-orbit/` and implementation under `src/` (**TypeScript**, **Zustand**, **Vitest** — see root `package.json`).

**Before coding**

- **Persisted market store:** `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md`.
- **GBM market engine:** `crew-orbit/feature-implement-gbm-market-engine/design/design-spec.md` (utility-only in `src/utils/marketEngine.ts`; no new UI here).
- **Market tick controller:** `crew-orbit/feature-add-market-tick-controller/design/design-spec.md` (lifecycle hook + interval controller; no UI in those modules).
- Prefer **state-layer-only** changes in the store: no UI or presentation imports in the store module; consumers use `useMarketStore` (per requirements in `spec/` when present).

**Cursor**

- Project rules live in `.cursor/rules/` (`.mdc` files with YAML frontmatter). They align with this feature’s stack and boundaries; they are the source of detailed editing constraints for agents.

**Humans**

- Keep AGENTS.md short; expand process or stack detail in feature `plan/` / `spec/` or in rule files, not duplicate long prose here.
