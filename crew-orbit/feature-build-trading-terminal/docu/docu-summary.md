# Trading terminal — documentation summary

## What shipped

- **UI:** `TradingTerminal` — Buy/Sell fieldset (native radios), cash/symbol/price readout, **Max buy: N shares** (buy + symbol + finite price > 0), **Shares held** in sell mode, whole-share quantity input, `Place buy` / `Place sell`, validation via `role="status"` + `aria-live`. No timers; data from `useMarketStore` only.
- **Trading:** Submit reads **live** `prices[ticker]` from `useMarketStore.getState()` (same rule as display), runs `simulateTradeExecution`, then `applyTradeResult` so cash, positions, and trade history stay consistent with the persisted market store.
- **Max buy math:** `maxWholeSharesAffordable` in `src/market/simulateTradeExecution.ts` — `floor(cash / price)`; shared with buy validation so UI cap matches execution.
- **Dashboard wiring:** `src/components/MarketDashboard.tsx` renders `<TradingTerminal />` next to other panels; tick loop stays on shell (`useMarketTickController`), not inside the terminal.

## Key files

| Area | Path |
|------|------|
| Component | `src/components/marketDashboard/TradingTerminal.tsx` |
| Domain (pure) | `src/market/simulateTradeExecution.ts`, `src/market/simulateTradeExecution.test.ts` |
| Store | `src/stores/market/marketStore.ts` (`applyTradeResult`, persist middleware) |
| Acceptance tests | `src/components/marketDashboard/TradingTerminal.acceptance.test.tsx` |
| UX/design contract | `crew-orbit/feature-build-trading-terminal/design/design-spec.md` |
| Cursor / AGENTS pointers | `.cursor/rules/feature-market-store.mdc`, root `AGENTS.md` |

## How to verify

- **Manual:** Open dashboard → select a symbol with a price → terminal shows cash, price, **Max buy** in buy mode → place buy/sell → charts/analytics reflect new cash/positions → refresh; portfolio should rehydrate from storage (see persisted-store behavior in `marketStore`).
- **Automated:** `TradingTerminal.acceptance.test.tsx` covers Max buy display, buy/sell store updates, rejection without mutation, tick-driven price/Max buy updates, and rehydration after a simulated reload.
- **Note:** `crew-orbit/feature-build-trading-terminal/implement/summary.md` and `validate/results.md` were **not present** in this checkout when this doc was written; treat this file + tests + paths above as the source of truth for “what landed.”

## Follow-ups

- Keep terminal changes aligned with `design/design-spec.md` (test ids, `aria-*`, palette).
- Any new broker-style fields (fees, limits) belong in `simulateTradeExecution` + store types first, then UI.
