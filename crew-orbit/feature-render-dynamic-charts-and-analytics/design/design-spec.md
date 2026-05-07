# Design Spec — Dynamic charts & analytics

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **React** (peer), **Zustand**, **Recharts `^2.15.2`**, **Vitest**, **TypeScript**. **No** Tailwind, shadcn/ui, Radix, or other UI kits. |
| `AGENTS.md` + `.cursor/rules/feature-market-store.mdc` | Dashboard UI is **plain React** with inline (or small scoped) styles; panels consume **`useMarketStore`** only. **`useMarketTickController`** mounts **once** on the shell (`MarketDashboard`); chart/analytics components must **not** own timers or tick loops. |
| `crew-orbit/feature-build-live-ticker-panel/design/design-spec.md` + **Trading terminal** spec | **Ivory Studio**-adjacent neutrals: surface `#fafaf9`, border `#e7e5e4`, text `#1c1917`, muted `#57534e` / `#44403c`; **4 / 8 / 12 / 16 / 24 / 32px** scale; **tabular numerals** on money; **no** decorative dashboard chrome. |
| `src/components/marketDashboard/*Chart*.tsx`, `AnalyticsPanel.tsx` | **Recharts** already used: **`LineChart`** (+ `Line`, `CartesianGrid`, axes, `Tooltip`) for price and equity; **`PieChart`** (+ `Pie`, `Cell`) for holdings by **mark-to-market value**; shared **measured width** hook for responsiveness. Chart math stays out of the store; panels read store selectors only. |
| `src/components/marketDashboard/chartConstants.ts` | **`PRICE_CHART_POINT_CAP = 100`** aligns persisted history cap for price chart initialization. |

**Conclusion:** Standardize on **Recharts** for all cartesian and pie visuals in this checkout. Keep **presentation** in dashboard components; **do not** move tick logic or portfolio formulas into chart modules. After host merge, remap hex values to host tokens without changing data contracts.

---

## Component Suggestions

| Area | Guidance |
|------|----------|
| **Library** | **Recharts** — already a dependency; use it **consistently** for the selected-symbol **line chart**, **equity curve** line chart, and **diversification** visualization. Do **not** add Lightweight Charts unless product explicitly requires trading-terminal-grade candles; that would split styling and behavior. |
| **Price + equity line charts** | **`LineChart`** with **`Line`** (`type="monotone"`, `dot={false}`), **`CartesianGrid`** (light stroke), **`XAxis` / `YAxis`** (small ticks, **10–12px**), **`Tooltip`** with concise labels (price to meaningful decimals; equity as **USD**). Prefer **`isAnimationActive={false}`** so updates feel **directly tied to ticks**, not decorative motion. |
| **Diversification** | **`PieChart`** + **`Pie`** representing **holdings by ticker** using **live mark-to-market value** from store (`positions` × `prices`). A modest **inner radius** (donut) is acceptable **because slices are real portfolio weights**, not placeholder KPIs — pair with a **plain text legend** (symbol + percent) for accessibility and scanning. Use **`Cell`** fills from a **small fixed palette** of muted, distinguishable hues (no neon/cyan accents). |
| **Analytics metrics** | Treat as a **dense tooling readout**, not a KPI grid: **`<section>`** with **`aria-label="Analytics"`**, **`h3`** + **`<dl>`** rows for **ROI (%)**, **Day P&L**, **Total P&L**. Reuse the same **bordered panel** treatment as chart cards. Optional muted line for **reference equity** context (already in implementation intent). |
| **Empty / loading states** | **Single muted sentence** (“No price history”, “No valued holdings”, “Awaiting equity samples”) — **no** illustrations, fake charts, or skeleton shimmer unless the host app standardizes it later. |
| **Shell** | **`MarketDashboard`** remains the only place that mounts **`useMarketTickController`**. Chart and analytics files: **selectors + render** only. |

**Explicit non-recommendations (Uncodixify):** No **hero** chart bands, **gradient** chart fills, **uppercase / letter-spaced** metric labels, **20px+** radii on chart cards, **dramatic shadows**, **transform** animations on series updates, or **decorative** donut center text (e.g. fake “total %” callouts). No secondary charting library “just for polish.”

---

## Spacing Tokens

Use the project **4 / 8 / 12 / 16 / 24 / 32px** scale (aligned with persisted-store + ticker + terminal specs).

| Token | Value | Charts & analytics usage |
|-------|-------|-------------------------|
| space-1 | **4px** | Title row **margin-bottom** below chart header; tight chart **margins** inside Recharts `margin` prop. |
| space-2 | **8px** | **Panel padding** inside each chart card (match ticker row rhythm); **gap** in pie legend flex rows. |
| space-3 | **12px** | **Analytics** inner padding; **shell `gap`** between stacked dashboard regions where `MarketDashboard` uses `gap: 12`. |
| space-4 | **16px** | **Between major strips** (ticker + terminal block vs. chart row) if the shell increases separation; outer gutter when composing beside a **240–260px** sidebar in a future host layout. |
| space-5 / space-6 | **24px / 32px** | Page-level vertical rhythm only — reserve for host shell, not micro-padding inside a single chart card. |

**Normalization note:** Existing chart panels use **8px** padding and **6px** radius; that is within the **8–12px card radius** band — keep **≤ 10px** for consistency with terminal **button** guidance.

---

## Design System Alignment

**Typography**

- **Family:** **System / inherited** stack — do **not** add Inter, Roboto, or Arial for chart labels unless the host already does.
- **Panel titles:** **14px**, **font-weight 600** (match analytics heading).
- **Axis ticks / legend:** **10–12px**, regular weight; **tabular numerals** on all currency and percentage readouts (`font-variant-numeric: tabular-nums` on DOM copy; Recharts `tick` props mirror sizes).
- **Tooltip content:** **12–14px**, sufficient contrast on default Recharts tooltip — if customizing tooltip wrapper, keep **neutral** background and **1px** border — no glass/blur.

**Colors (project-first)**

Align chart cards with **sibling panels** (ticker / terminal intent):

- **Card surface:** `#fafaf9` (Ivory Studio surface); **border:** `#e7e5e4` or **`1px solid` ~12% black** if staying literal to current implementation — **converge** to **`#e7e5e4`** when touching styles for consistency.
- **Primary text:** `#1c1917`; **muted / empty state:** `#57534e` or **`rgba(0,0,0,0.55)`** equivalent.
- **Series strokes:** Calm, non-cyan accents — e.g. **deep teal / slate** for equity (**`#3d6e8c`**-class) and **forest** for price (**`#1a5f4a`**-class); keep **saturation moderate**.
- **Grid:** **Low-contrast** neutral stroke (`rgba(0,0,0,0.06)` class) — visible but recessive.
- **P&L semantics (optional):** If coloring Day/Total P&L, use **muted green / red** text only — avoid loud **red/green** fills or badges.

**Borders, shadows, radii**

- **Chart cards:** **`1px`** border, **`6–8px`** radius (prefer **8px** to match ticker rows if unifying).
- **Shadows:** **None** on panels — separation via border and background only.
- **Motion:** **No** line draw animations on tick updates; **no** zoom/pan flourishes for v1.

**Accessibility**

- **Root:** `aria-label` on each chart container (price, equity, diversification) and on the analytics region.
- **Equity / price:** Charts are supplementary; ensure **visible numeric summary** (last price / last equity) stays in the panel header for quick readout.
- **Pie:** Color is not the only signal — **legend lists symbol + percent** (implementation already trends this way).

---

## Layout Notes

- **Dashboard order (reference):** `LiveTickerPanel` → `TradingTerminal` → **row:** `SelectedTickerPriceChart` + `EquityCurveChart` (flex wrap, **12px** gap, `minWidth: 0` for shrink) → `HoldingsDiversificationChart` → `AnalyticsPanel` → `ChartStripPanel`. Keeps **read → act → visualize → metrics** flow.
- **Responsive behavior:** Charts live in a **measured container** (`ResizeObserver` + numeric `width` for Recharts) so the dashboard can **wrap** on narrow viewports; each card **flexes** with **`minWidth` ~280px** and **`maxWidth: 100%`** — maintain **horizontal scroll avoidance** by letting charts **stack** rather than overflow ornately.
- **Data source of truth:** All series and metrics **read from `useMarketStore`** (history buffers, prices, positions, cash, reference/day equity fields). **No** duplicate sampling or client-only series outside the store pipeline driven by **`applyMarketTick`** / trade actions.
- **Separation:** Chart components **render** store-derived data; **market math**, **tick scheduling**, and **trade execution** stay in **`marketEngine`**, **tick controller**, **store**, and **trade helpers** — consistent with architecture acceptance tests.

---

## Handoff note for developers

Prefer **one chart library (Recharts)** end-to-end. When adjusting styles, **centralize** repeated panel style objects or tokens so price, equity, pie, and analytics **feel like one tooling family**. Preserve **`data-testid`** contracts used in acceptance tests when changing layout.
