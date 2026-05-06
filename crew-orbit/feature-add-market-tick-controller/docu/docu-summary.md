# Market tick controller — documentation summary

**Task:** Periodic GBM-driven market simulation bridged into the persisted Zustand store; single tick source for dashboard UI.

## What shipped

- **`createMarketTickController`** (`src/market/marketTickController.ts`): client-side `setInterval` loop, default **2000 ms**. Each tick reads current store state, runs **`runMarketTick`** from `src/utils/marketEngine.ts` for all **tracked** symbols (engine default params ∪ `prices` keys ∪ `marketHistory` keys), then commits **once** via **`applyMarketTick`** (no `setState` bypass).
- **`useMarketTickController`** (`src/market/useMarketTickController.ts`): React hook that creates the controller, starts after **`onMarketStoreHydrationComplete`** (or immediately if already hydrated), **`stop`** + hydration unsubscribe on unmount; generation guard avoids stale starts.
- **Dashboard wiring:** `src/dashboard/Dashboard.tsx` calls **`useMarketTickController()`** once; `MarketTickerStrip`, `PriceHistorySnippet`, and `AnalyticsReadout` remain **read-only** `useMarketStore` consumers (no duplicate timers).

## Key files

| Area | Path |
|------|------|
| Controller factory | `src/market/marketTickController.ts` |
| Lifecycle hook | `src/market/useMarketTickController.ts` |
| Mount site | `src/dashboard/Dashboard.tsx` |
| Engine | `src/utils/marketEngine.ts` |
| Store write API | `applyMarketTick` in `src/stores/market/marketStore.ts` |
| Tests | `src/market/marketTickController.acceptance.test.ts`, `src/market/useMarketTickController.test.tsx`, `src/dashboard/Dashboard.integration.test.tsx` |

## Coordination / rules (already in repo)

- `AGENTS.md` links this feature’s design spec.
- `.cursor/rules/feature-market-store.mdc` documents tick boundaries (one loop, one mount, rehydration alignment).

## How to verify (for the next implementer or QA)

- Run Vitest on the market package / focused files (e.g. `marketTickController`, `useMarketTickController`, `Dashboard.integration`) and confirm interval cleanup and single `applyMarketTick` per tick assertions pass.
- Manually: open Dashboard, observe store-driven panels updating on a ~2 s cadence; navigate away / unmount and ensure no continued updates (no leaked interval).

## Follow-ups

- Host apps with persistence: confirm product rules for **when** to start the loop relative to `onFinishHydration` (this hook already waits for hydration via `src/stores/market/index.ts` helpers).
- Do not add second `setInterval` or engine calls inside individual panels; extend the controller or store if new symbols or cadence rules are needed.

## References

- Design: `crew-orbit/feature-add-market-tick-controller/design/design-spec.md` (implement/validate summaries were absent here; content reflects design + `src/` review.)
