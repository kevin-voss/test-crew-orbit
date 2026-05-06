# Design Spec

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **`zustand`**, TypeScript, **Vitest**; **`react`** as peer/dev for typing and hooks. **No** Tailwind, Radix, shadcn, charting, or other UI/CSS packages declared. |
| `src/market/useMarketTickController.ts` | Dashboard-level hook calling `createMarketTickController` → **`start` on mount, `stop` on unmount**; updates flow through **`applyMarketTick` on `useMarketStore`** (single source of truth). |
| `src/market/marketTickController.ts` | **`setInterval`** tick (default **2000 ms**) reads store, runs **`marketEngine`**, writes **`applyMarketTick` once per tick**. |
| `AGENTS.md` + `.cursor/rules/feature-market-store.mdc` | State/persistence/store boundaries; presentation lives in consumers; repeat **host-app discovery** after merge for real design tokens/components. |
| `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md`, `crew-orbit/feature-implement-gbm-market-engine/design/design-spec.md` | **Spacing scale 4→32 px**, typography density, Ivory Studio fallback (docs-only), Uncodixify posture—**carry forward here.** |

**Conclusion:** The **tick controller itself has no rendered UI.** UX guidance focuses on **where** lifecycle runs (dashboard shell), **how** dependent panels behave when all refresh from the **same store** every **~2 s**, and **parity** with sibling market specs. After integration into a host SPA, re-verify stack and tokens in that repo.

---

## Component suggestions

**Controller / hook (this task)**  
- **No new visual components** in `marketTickController` or `useMarketTickController`. Do not add loading spinners, status banners, or decorative “sync” chrome inside the controller module.

**Dashboard shell (host / future UI)**  
| Need | Guidance |
|------|----------|
| Tick lifecycle | Call **`useMarketTickController` exactly once** at the **dashboard layout or root that owns the market surface**—not inside every ticker cell, chart, or analytics card. |
| Ticker, charts, analytics | Each panel is a **read-only consumer** of **`useMarketStore` selectors**; no local `setInterval` or duplicate engine calls. Prefer **dense inline text, tables, or minimal sparklines** per GBM + persisted-store specs—**not** KPI hero grids or decorative charts. |
| Rehydration | If persistence is enabled, align with **AC-3 / AC-11** intent: avoid UI that **contradicts** restored state before hydration completes; start the tick loop only when product rules say it is safe (often **after** `onFinishHydration` / equivalent in the host app). |
| Optional “live” affordance | **Not required** by acceptance criteria. If stakeholders want feedback, use a **single** subtle pattern at shell level (e.g. one **muted text** “Live · 2s” or a **small dot** using host **semantic** `muted-foreground`)—**no** pulsing transforms, glass panels, or uppercase eyebrow labels. |

**Do not add** shadcn, Radix, or other kits **unless** the integrated app already depends on them.

---

## Spacing tokens

Reuse the **shared scale** from prior market feature specs (task constraint: **4 / 8 / 12 / 16 / 24 / 32 px**):

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
1. Prefer **existing** semantic tokens from the integrated app (**background**, **foreground**, **muted**, **border**, optional **chart-* ** if defined).  
2. If documenting a neutral reference palette only (no mandate to hard-code in controller code): **Ivory Studio** (light)—background `#f5f5f4`, surface `#fafaf9`, primary `#0891b2`, secondary `#06b6d4`, accent `#f59e0b`, text `#1c1917`.

**Borders, shadows, radii (when panels visualize store data)**  
- Panels/cards: **1px** border, radius **8–12px** max. Buttons elsewhere: **8–10px** radius, solid fills.  
- Shadows: minimal; **avoid** dramatic elevation (e.g. `0 24px 60px`).  
- Sidebar width if present: **240–260px**, solid surface—no floating gradient shells.

**Motion**  
- Prefer **immediate** numeric and series updates aligned to the **single store commit per tick**. Avoid transform-heavy number animations unless the host system already specifies them—reduces jitter on a **2 s** cadence.

**Uncodixify reminders**  
- No hero sections inside internal dashboards, fake charts, donut “portfolio” widgets, cyan-on-blue gradients, oversized radii, or uppercase tracked “labels.”

---

## Layout notes

- **Single coordinated refresh:** Because **one tick** drives **one** `applyMarketTick`, ticker, charts, and analytics should **appear in lockstep**. Avoid individual panel spinners refetching on their own timers—that would contradict the unified flow and confuse users.  
- **Mount hierarchy:** Prefer **dashboard (or route) mount** → rehydrate (if applicable) → **start controller** → **children read store** only. On **unmount or scope end**, **`stop`** clears the interval—no orphaned timers flickering partial UI updates.  
- **Density:** Read as **trading tooling**—side-by-side ticker + chart is fine when space allows; on narrow screens **stack vertically** with **16–24px** gaps (see token table).  
- **Responsive:** Do not rely on hover-only disclosure for **current prices** required for the simulation story.
