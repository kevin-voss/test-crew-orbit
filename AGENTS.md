# Agent guidance (Cursor)

This repository is a **crew-orbit** coordination checkout: feature specs and role outputs under `crew-orbit/`. Implementation for the persisted market store may live in a sibling feature workspace with **TypeScript**, **Zustand**, and **Vitest** (see that tree’s `package.json`).

**Before coding**

- Read the feature **design spec**: `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md`.
- Prefer **state-layer-only** changes in the store package: no UI or presentation imports in the store module; consumers use `useMarketStore` (per requirements in `spec/` when present).

**Cursor**

- Project rules live in `.cursor/rules/` (`.mdc` files with YAML frontmatter). They align with this feature’s stack and boundaries; they are the source of detailed editing constraints for agents.

**Humans**

- Keep AGENTS.md short; expand process or stack detail in feature `plan/` / `spec/` or in rule files, not duplicate long prose here.
