# Docu summary — Responsive dashboard layout

Purpose: snapshot of **this feature** so the next human/agent knows what shipped, where it lives, and how to sanity-check it. (Written from `src/` + `design/design-spec.md`; `implement/summary.md` and `validate/results.md` were not present under this feature folder at doc time.)

## What shipped

- **Next.js App Router** `/dashboard` page (`"use client"`), Tailwind **`main`** wrapper + centered max width.
- **`MarketDashboard`** composes **`DashboardShell`**: responsive **3-column CSS Grid** (`1` col narrow, `lg:grid-cols-3` desktop), **`max-w-[1920px]`**, stable **`data-testid`** hooks for shell, grid, and each column.
- **Panels only consume the store**; market math/engine/persistence stay out of dashboard JSX (see acceptance test guardrails).

## Initialization order (reload-friendly)

1. Persisted **`useMarketStore`** rehydrates (Zustand persist).
2. **`useMarketTickController`** runs **once** in **`DashboardShell`**: waits for hydration (or starts immediately if already hydrated), **`start`** on interval write path, **`stop`** on unmount.
3. Ticker, chart/trade strip, and portfolio/analytics panels update from the **same store** tick — **no parallel timers** in panel modules (per `.cursor/rules/feature-market-store.mdc`).

## Column map (implemented)

| Column | Region `data-testid` | Contents (top → bottom) |
|--------|----------------------|--------------------------|
| 1 Tickers | `dashboard-column-tickers` | **`LiveTickerPanel`** |
| 2 Chart / trade | `dashboard-column-chart-trade` | **`SelectedTickerPriceChart`**, **`TradingTerminal`**, **`ChartStripPanel`** |
| 3 Portfolio | `dashboard-column-portfolio` | **`AnalyticsPanel`**, **`HoldingsDiversificationChart`**, **`EquityCurveChart`** |

- **Sr-only headings** label each column for reading order / a11y; columns use **`min-w-0`**, **`gap-3`** stack spacing, **`overflow-auto`** for tall content.

## Key files

- `src/app/dashboard/page.tsx` — route composition.
- `src/components/MarketDashboard.tsx` — thin root (`data-testid="market-dashboard"`).
- `src/dashboard/DashboardShell.tsx` — grid, panel wiring, **`useMarketTickController()`**.
- `src/market/useMarketTickController.ts` — hydration-gated lifecycle.
- `src/app/page.tsx` — redirects **`/`** → **`/dashboard`** for default entry.

## How to verify (without running infra in doc step)

- **Automated:** `src/components/responsiveDashboardLayout.acceptance.test.tsx` (route + Tailwind grid + column test IDs + responsiveness charter + **no financial `fetch`** during tick + layering checks).
- **Manual:** Open **`/dashboard`** in a browser; widen past **`lg`** for three tracks; shrink for single-column stacking; refresh and confirm persisted portfolio/tickers reconcile before ticks advance.

## Follow-ups

- If product wants **`TradingTerminal` above the primary chart**, align **`DashboardShell.tsx`** stacking with `design/design-spec.md` (design doc currently suggests a slightly different vertical order for column 2).
- Populate **`implement/summary.md`** / **`validate/results.md`** when this feature’s implementation/QA roles land written artifacts beside `docu/`.
