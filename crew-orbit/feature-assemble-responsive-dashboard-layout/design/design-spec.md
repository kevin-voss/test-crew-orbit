# Design Spec — Responsive dashboard layout

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **Next.js ~14**, **React 18**, **Tailwind CSS ~3.4**, **Zustand**, **Recharts**, **Vitest**. **No** shadcn/ui, Radix, or other component kits. |
| `src/app/layout.tsx`, `src/app/dashboard/page.tsx` | App shell uses Tailwind utilities (`min-h-screen`, `bg-neutral-50`, flex + padding). Dashboard route is a **`"use client"`** page wrapping the market surface. |
| `src/components/MarketDashboard.tsx` | **Single shell** mounts **`useMarketTickController`**; **CSS Grid** `grid-cols-1` / `lg:grid-cols-3` with stable **`data-testid`** hooks for columns and grid. Composes existing panels only—no duplicate market logic. |
| `.cursor/rules/feature-market-store.mdc` | **One** tick controller at dashboard shell; panels are **passive** (no timers). After merge into a host app, remap tokens—until then align with Ivory-adjacent panel specs. |
| Sibling design specs (`feature-build-live-ticker-panel`, `feature-build-trading-terminal`, `feature-render-dynamic-charts-and-analytics`) | **Ivory Studio**-style neutrals, **4 / 8 / 12 / 16 / 24 / 32px** scale, **8–12px** card radii, **no** decorative dashboard chrome; **plain React** styling inside panels alongside **Tailwind for layout shell**. |

**Conclusion:** Treat this feature as **composition + responsive shell** only: Next.js page → **`MarketDashboard`** → three columns. Use **Tailwind** for grid, gutters, max width, and overflow behavior; **do not** introduce shadcn/Radix. Keep visual language consistent with existing **`marketDashboard/`** panels (borders, stone neutrals, flat cards).

---

## Component suggestions

| Layer | Guidance |
|-------|----------|
| **Route / page** | Next.js **`dashboard` route** with a single **`<main>`** landmark (existing pattern). Keep **`"use client"`** where the dashboard must run after store rehydration and controller start. |
| **Shell** | **`MarketDashboard`** (or equivalent) owns **`useMarketTickController` exactly once** and renders the **responsive grid**. No market math, persistence, or engine imports in the page file—only composition. |
| **Column 1 — Tickers** | **`LiveTickerPanel`** only (matches acceptance charter). |
| **Column 2 — Chart / trade** | Stack: **`TradingTerminal`**, **`SelectedTickerPriceChart`** (`variant` default / dashboard), **`ChartStripPanel`**. Order matches “act on symbol → see primary chart → compact history strip.” |
| **Column 3 — Portfolio** | Stack: **`AnalyticsPanel`**, **`HoldingsDiversificationChart`**, **`EquityCurveChart`**. |
| **Charts** | Continue **Recharts** inside existing components—no second chart library for the layout task. |
| **Primitives** | **No** new UI kit. Use **semantic HTML** at the page level (`main`, optional column wrappers as `div` with `min-w-0` and `box-border` to avoid grid blowout). |

**Explicit non-recommendations (Uncodixify):** No hero header inside the dashboard, no metric KPI grid as the page frame, no glass panels or full-viewport gradients, no floating chatty copy, no **20px+** radii or dramatic shadows on the shell.

---

## Spacing tokens

Align with the **project scale** (multiples of **4px**). Map to **Tailwind** where the shell already uses utilities.

| Token | px | Shell / layout usage |
|-------|-----|----------------------|
| space-1 | 4 | Rare; only for micro-adjustments if a gutter clashes with scrollbar. |
| space-2 | 8 | Inner consistency reference—panels themselves already use **8px** rhythm in sibling specs. |
| space-3 | 12 | **Column stack gap** inside each logical column (`gap-3` ≈ **12px**)—matches existing `MarketDashboard` intent. |
| space-4 | 16 | **Grid gap** base (`gap-4`); horizontal **padding** steps like **`px-3`/`px-4`** are **12/16px**—acceptable if shell stays on the scale. |
| space-5 | 24 | **Vertical section padding** on the page (`md:py-6` is **24px**); consider **`lg:gap-6`** for **between-column** gap instead of non-multiple **20px** (`gap-5`) if tightening system coherence. |
| space-6 | 32 | Large outer padding on wide viewports (`lg:p-8`) or extra air above/below the grid only if the route needs separation from a future global nav. |

**Existing anchors:** `MarketDashboard` uses **`mx-auto`**, **`max-w-[1920px]`**, **`px-3 py-4 md:px-4 md:py-6`**—keep this **max width** so ultra-wide monitors do not stretch panels past a tool-like readable line. Prefer **`overflow-x-hidden`** on the route wrapper only if charts still measure correctly (charts use width hooks—avoid clipping their measurement containers).

---

## Design system alignment

**Typography**

- **Inherit** root / system stack—**do not** add Inter, Roboto, or Arial for this layout task.
- **Body rhythm** for any page-level title (if added later): **14–16px**, **weight 600** max; **no** uppercase letter-spaced labels.

**Colors**

1. **First:** Reuse **Ivory / stone** panel tokens from sibling specs (**surface `#fafaf9`**, **border `#e7e5e4`**, **text `#1c1917`**, muted **`#57534e`**).
2. **Shell background:** Current app uses **`bg-neutral-50`** (Tailwind)—**harmonizes** with Ivory Studio **`#f5f5f4`**; avoid introducing a second unrelated base (no cyan/blue-gray overlays).

**Borders, shadows, radii**

- **Layout shell:** **No** heavy shadow on the outer wrapper; separation is **light background + panel borders** inside columns.
- **Radii:** Shell containers stay **0–8px** if a card wrapper is ever added; never **20px+** for the dashboard frame.

**Motion**

- **None** at layout level; flash/micro-motion stays inside **LiveTickerPanel** per its spec.

---

## Layout notes

- **Desktop (lg+):** Three **equal-width** tracks (`lg:grid-cols-3`) with **ordered children**: Tickers → Chart/Trade → Portfolio. Preserve **DOM order** for **WCAG** reading order and current tests.
- **Narrow:** **Single column**, same order top-to-bottom; ensure **`min-w-0`** on columns and grid so **Recharts** and flex children do not force horizontal scroll (acceptance expects scroll width near viewport).
- **Controller lifecycle:** Visual “live” state is a consequence of **shell-mounted** tick controller **after** store rehydration—layout must not start alternate timers; loading UX is **inherited** from store/panel empty states (no blocking full-screen splash unless product adds one later).
- **Performance:** One grid, one controller, **panels subscribe** narrowly—avoid extra wrapper `useMarketStore()` subscriptions in the shell beyond the hook.

---

## Handoff (design)

- **Developer:** Implement or adjust **`src/app/dashboard/page.tsx`** + **`MarketDashboard`** to match this composition; keep **`data-testid`** contracts from `responsiveDashboardLayout.acceptance.test.tsx`.
- **QA:** Verify three columns at **~1280px** width intent, single column at **~360px**, no stray tick hooks in panels.
