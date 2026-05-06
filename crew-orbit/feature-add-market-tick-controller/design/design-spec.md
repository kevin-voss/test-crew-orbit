# Design Spec

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **`zustand`**, TypeScript, **Vitest**; **`react`** as peer/dev for typing and hooks. **No** Tailwind, Radix, shadcn, charting, or other UI/CSS packages declared. |
| `src/market/marketTickController.ts` | **`createMarketTickController`**: **`setInterval`** tick (default **2000 ms**) reads store, runs **`marketEngine`**, writes **`applyMarketTick` once per tick**. **`executeGbmMarketStep`** centralizes the GBM call for tests and adapters. |
| `src/market/useMarketTickController.ts` | React hook around **`createMarketTickController`** → hydration-gated **`start` / `stop`**; injectable **`runMarketTick`** / **`intervalMs`** / **`getStore`** in tests; used by **`Dashboard`** and **`MarketDashboard`**. |
| `src/dashboard/Dashboard.tsx` | Calls **`useMarketTickController`** once; panels read **`useMarketStore`** only. |
| `src/components/MarketDashboard.tsx` + panels | Same hook from **`src/market/`** once; **`TickerPanel`**, **`ChartStripPanel`**, **`AnalyticsPanel`** — semantic HTML, store-only reads. |
| `AGENTS.md` + `.cursor/rules/feature-market-store.mdc` | State/persistence/store boundaries; presentation in consumers; repeat **host-app discovery** after merge. |
| `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md`, `crew-orbit/feature-implement-gbm-market-engine/design/design-spec.md` | **Spacing scale 4→32 px**, typography density, Ivory Studio fallback (docs-only), Uncodixify posture—**carry forward here.** |

**Conclusion:** Tick logic is **lifecycle + data bridge**—**no rendered UI** inside controller/loop modules. **One hook invocation per dashboard shell**; panels stay on **`useMarketStore`**. After integration into a host SPA, re-verify stack and tokens in that repo.

---

## Component suggestions

**Controller / hook (this task)**  
- **No new visual components** in `marketTickController` or **`useMarketTickController`**. Do not add loading spinners, status banners, or decorative “sync” chrome inside those modules.
- **Do not** add **`setInterval`**, per-panel polling, or duplicate engine calls inside leaf panels—whether **`MarketTickerStrip`** / **`AnalyticsReadout`** or **`TickerPanel`** / **`ChartStripPanel`** / **`AnalyticsPanel`**.

**Dashboard shell (host / future UI)**  
| Need | Guidance |
|------|----------|
| Tick lifecycle | Call **`useMarketTickController` exactly once** at the **layout that owns the market surface** (`Dashboard`, `MarketDashboard`, or host route)—not inside every ticker cell, chart, or analytics card. |
| Ticker, charts, analytics | Each panel is a **read-only consumer** of **`useMarketStore` selectors**. Prefer **dense inline text, tables, or minimal sparklines** per GBM + persisted-store specs—**not** KPI hero grids or decorative charts. |
| Rehydration | Align with **AC-3 / AC-11** intent: avoid UI that **contradicts** restored state before hydration completes; start the tick loop when product rules say it is safe. |
| Optional “live” affordance | **Not required**. If desired, **single** subtle pattern at shell level (e.g. **muted text** “Live · 2s” or a **small dot**)—**no** pulsing transforms or uppercase eyebrow labels. |

**Do not add** shadcn, Radix, or other kits **unless** the integrated app already depends on them.

**Explicit non-recommendations (Uncodixify)**  
- KPI metric-card grids as default, fake charts, donut widgets, eyebrow labels, cyan accent ramps, **>12px** card radius as default, or transform-heavy number animations on every 2s tick.

---

## Spacing tokens

Reuse the **shared scale** (task constraint: **4 / 8 / 12 / 16 / 24 / 32 px**):

| Token | Value | Typical use (market UI fed by this tick) |
|-------|-------|-----------------------------------------|
| `space-1` | **4px** | Badge–price gaps, sparkline margins |
| `space-2` | **8px** | Compact table padding, toolbar gaps |
| `space-3` | **12px** | Label + value stacks in rows |
| `space-4` | **16px** | Panel interior padding |
| `space-5` | **24px** | Between ticker strip and chart block |
| `space-6` | **32px** | Page / column outer margins |

**Tailwind/CSS variables:** None in this checkout. Map to host tokens on merge; if the host uses default Tailwind spacing, align **explicitly** to existing usage (`gap-*`, `p-*`) rather than assuming 1 unit = 4px without checking.

---

## Design system alignment

**Typography**  
- **14–16px** body for live prices and history metadata; **`font-variant-numeric: tabular-nums`** where decimals align across rows.  
- Use the **host** font stack; do **not** introduce Inter/Roboto/Arial/Segoe specifically for this feature.

**Colors**  
1. Prefer **existing** semantic tokens from the integrated app (**background**, **foreground**, **muted**, **border**, optional **chart-*** if defined).  
2. Documentation-only reference: **Ivory Studio** (light)—background `#f5f5f4`, surface `#fafaf9`, primary `#0891b2`, secondary `#06b6d4`, accent `#f59e0b`, text `#1c1917`.

**Borders, shadows, radii (when panels visualize store data)**  
- Panels/cards: **1px** border, radius **8–12px** max. Buttons elsewhere: **8–10px** radius, solid fills.  
- Shadows: minimal; **avoid** dramatic elevation (e.g. `0 24px 60px`).  
- Sidebar width if present: **240–260px**, solid surface—no floating gradient shells.

**Motion**  
- Prefer **immediate** numeric and series updates aligned to the **single store commit per tick**. Avoid transform-heavy number animations unless the host system already specifies them.

**Uncodixify reminders**  
- No hero sections inside internal dashboards, fake charts, donut “portfolio” widgets, cyan-on-blue gradients, oversized radii, or uppercase tracked “labels.”

---

## Layout notes

- **Single coordinated refresh:** One tick drives one **`applyMarketTick`** — ticker, charts, and analytics should **appear in lockstep**. Avoid per-panel spinners on separate timers.  
- **Mount / scope:** Dashboard mount → rehydrate (if applicable) → **start controller** → children read store. On unmount, **`stop`** clears the interval—no orphaned timers.  
- **Density:** Trading-tooling density; side-by-side ticker + chart when space allows; narrow viewports **stack** with **16–24px** gaps.  
- **Stability at 2s cadence:** Reserve **min-height** or tabular styling if numeric rows flicker when values change frequently.  
- **Responsive:** Do not rely on hover-only disclosure for **current prices** required for the simulation story.  
- **Scope boundary:** Controller and hook remain **client-only** without presentation imports; optional tick debug UI belongs in dev tooling, not the core store.
