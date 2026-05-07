# Documentation summary — Dynamic charts & analytics

## What shipped (product)

- **Library:** **Recharts** for all dashboard charts (line + pie), consistent with `package.json`.
- **Single tick entry:** `MarketDashboard` mounts `useMarketTickController()` once; charts and analytics are passive consumers of `useMarketStore` (same pipeline as ticker and terminal).
- **Selected stock price:** `SelectedTickerPriceChart` reads the persisted **100-point** history cap via `PRICE_CHART_POINT_CAP` in `chartConstants.ts`, aligned with GBM/store history; updates when ticks append new prices.
- **Equity curve:** `EquityCurveChart` plots portfolio equity over time from store equity history.
- **Analytics metrics:** `AnalyticsPanel` shows **ROI (%)**, **Day P&L**, **Total P&L** using `src/analytics/portfolioMetrics.ts` (pure helpers; store holds state).
- **Diversification:** `HoldingsDiversificationChart` is a **PieChart** of holdings by **mark-to-market value** (`shares × price`), with legend/empty states; full-width wrapper in `MarketDashboard` for responsive flex.
- **Separation:** Chart modules contain **no** `marketEngine`, tick controller, `applyMarketTick`, or `setInterval` — enforced by `chartSurfaces.architecture.acceptance.test.ts` and `src/market/chartBoundary.qa.test.ts`.

## Key paths

| Area | Path(s) |
|------|---------|
| Shell & order | `src/components/MarketDashboard.tsx` |
| Charts | `src/components/marketDashboard/SelectedTickerPriceChart.tsx`, `EquityCurveChart.tsx`, `HoldingsDiversificationChart.tsx`, `ChartStripPanel.tsx` |
| Constants / layout width | `src/components/marketDashboard/chartConstants.ts`, `useChartInnerWidth.ts` |
| Analytics math | `src/analytics/portfolioMetrics.ts` |
| Cursor / agent pointers | `.cursor/rules/feature-market-store.mdc`, root `AGENTS.md` (see `ai-config/ai-config-setup.md`) |
| Design intent | `crew-orbit/feature-render-dynamic-charts-and-analytics/design/design-spec.md` |
| Implement traceability | `crew-orbit/feature-render-dynamic-charts-and-analytics/implement/04-frontend-diversification-pie-and-integration-qa-summary.md` |

## How to verify (for humans)

- Run **typecheck** and **Vitest** suites that touch this surface (per design spec §4 / implement notes), e.g. filters on `MarketDashboard`, `dynamicChartsAndAnalytics.acceptance.test.tsx`, `chartSurfaces.architecture.acceptance.test.ts`, `chartBoundary.qa.test.ts`, `Dashboard.integration.test.tsx`, and `HoldingsDiversificationChart.test.tsx` if present.
- **Manual smoke:** open dashboard → confirm price and equity charts populate from history after rehydration → enable ticks → watch selected-symbol chart and equity curve move → trade → pie and analytics update without extra timers in chart files.

## Follow-ups

- **`implement/04-...` note:** That file recorded the dedicated `HoldingsDiversificationChart.test.tsx` path as missing; the repo now includes `src/components/marketDashboard/HoldingsDiversificationChart.test.tsx` — refresh that implement note if you need strict traceability with §4 commands.
- **No `validate/results.md`** or root **`implement/summary.md`** in this feature folder at documentation time — use this file + `04-frontend-...` + design spec for continuity.
- Optional future split: dedicated `.cursor` rule for `*Chart*` globs (see `ai-config/ai-config-setup.md`).

## References in this repo

- `crew-orbit/feature-render-dynamic-charts-and-analytics/ai-config/ai-config-setup.md` — what changed in Cursor rules / `AGENTS.md` for this feature area.
