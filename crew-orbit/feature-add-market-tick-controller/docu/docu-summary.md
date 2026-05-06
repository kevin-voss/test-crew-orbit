# Market tick controller — documentation summary

**Task:** Periodic GBM-driven market simulation bridged into the persisted Zustand store; **single tick source** per dashboard shell; store-only writes.

## What shipped

- **`createMarketTickController`** (`src/market/marketTickController.ts`): **`setInterval`** loop (default **2000 ms**). Each tick reads store state, runs **`runMarketTick`** / **`marketEngine`** for tracked symbols (default params ∪ store price/history keys), commits **once** via **`applyMarketTick`**. **`executeGbmMarketStep`** centralizes the GBM step for tests and adapters. **`MarketController`** type aliases the controller handle.
- **`useMarketTickController`** (`src/market/useMarketTickController.ts`): Hook wrapping **`createMarketTickController`** — hydration-gated **start/stop**, optional injectable **`runMarketTick`** / **`intervalMs`** in tests; generation guard for StrictMode.
- **`Dashboard`** (`src/dashboard/Dashboard.tsx`): **`useMarketTickController()`** once; read-only **`useMarketStore`** children.
- **`MarketDashboard`** (`src/components/MarketDashboard.tsx`): Same hook once; **`TickerPanel`**, **`ChartStripPanel`**, **`AnalyticsPanel`** are store-only consumers.

## Key files

| Area | Path |
|------|------|
| Controller factory + GBM adapter | `src/market/marketTickController.ts` |
| Hook | `src/market/useMarketTickController.ts` |
| Example shells | `src/dashboard/Dashboard.tsx`, `src/components/MarketDashboard.tsx` |
| Engine | `src/utils/marketEngine.ts` |
| Store | `src/stores/market/` (`applyMarketTick`, hydration helpers) |
| Tests | `src/market/*.test.*`, `src/dashboard/Dashboard.integration.test.tsx` |

## Spec / rules

- Feature design: `crew-orbit/feature-add-market-tick-controller/design/design-spec.md`
- Editor boundaries: `.cursor/rules/feature-market-store.mdc` → Market tick controller

## How to verify

- Run Vitest on tick controller, hooks, and dashboard integration suites.
- Manual: open a dashboard shell → panels update ~every **2s** from one store snapshot; unmount → no leaked interval.

## Follow-ups

- **Host merge:** one **`useMarketTickController` call** per owning layout.
- **Persistence:** align tick **start** with product rules vs **`onFinishHydration`** (hooks already gate on store hydration helpers).
- **Background tabs:** timers may throttle; wall-clock spacing can exceed **2s**.

## Context gap

- `crew-orbit/.../implement/summary.md` and `validate/results.md` were **not** present in this checkout; summary aligns with **`src/`** and the feature **design-spec**.
