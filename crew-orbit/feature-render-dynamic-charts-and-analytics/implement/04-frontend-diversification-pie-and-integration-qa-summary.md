# 04 — Diversification pie and integration QA (implementation summary)

## What shipped

- **`HoldingsDiversificationChart`** (Recharts `PieChart` / `Pie` / `Cell` / `Tooltip`) reads `positions` and `prices` from `useMarketStore`, weights slices as `shares * price` for finite positive marks, normalizes percentages in the legend (`holdings-diversification-slice-pct-<TICKER>`), excludes cash, and shows a coherent empty copy when there are no valued holdings (AC-10, AC-14).
- **`MarketDashboard`** wraps the pie in a full-width `minWidth: 0` shell so the chart row and pie shrink cleanly in narrow layouts (AC-9 alignment with the existing flex dashboard).
- **`src/market/chartBoundary.qa.test.ts`** automates an AC-7-style sweep: production `*Chart*.tsx` modules under `marketDashboard` (excluding `*.test*` / `*.qa.*`) and non-test `src/analytics/*.ts` must not contain tick-controller, engine, `simulateTradeExecution`, interval, or `applyMarketTick` substrings.

## Validation

Commands from spec §4:

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm exec vitest run src/components/marketDashboard/HoldingsDiversificationChart.test.tsx` | **No test file in repo** — Vitest reports “No test files found” (exit 1). The plan lists this file for the Test Engineer to add; developer role did not author tests per oracle rules. |
| `npm exec vitest run src/components/MarketDashboard` | Pass (includes `dynamicChartsAndAnalytics.acceptance.test.tsx`, covering pie AC-5 / AC-14 among others) |
| `npm exec vitest run src/dashboard/Dashboard.integration.test.tsx` | Pass |
| `npm exec vitest run src/market/chartBoundary.qa.test.ts` | Pass (optional QA guard added in this step) |

## Follow-up

- Add `src/components/marketDashboard/HoldingsDiversificationChart.test.tsx` per plan §5 so the first Vitest path in §4 exits 0.
