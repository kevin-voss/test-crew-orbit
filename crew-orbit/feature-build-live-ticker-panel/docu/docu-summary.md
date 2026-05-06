# Docu summary — Live ticker panel

**Scope:** What exists in-repo for the live ticker feature (store-backed list + flash on price moves).  
**Note:** `implement/summary.md` and `validate/results.md` were not present under this feature folder; this file reflects current `src/` behavior and `design/design-spec.md`.

## What shipped

- **Dashboard ticker:** `MarketDashboard` mounts **`useMarketTickController` once** and renders **`TickerPanel`** beside chart and analytics (`src/components/MarketDashboard.tsx`). Prices update when the store changes after ticks—no tick/timer logic inside the panel.
- **`TickerPanel`:** Vertical `<ul>` of symbols with finite `prices` from **`useMarketStore((s) => s.prices)`**, lexicographic order. Compares each tick to a baseline; **green** flash on increase, **red** on decrease (**~400ms**, CSS keyframes on row background). **`data-testid`** / **`data-live-ticker-flash`** for QA. Empty copy: **“No quote”** (`src/components/marketDashboard/TickerPanel.tsx`).
- **`LiveTickerPanel`:** Alternate **card-row** layout (border, surface color, tabular nums, **two decimal** prices). Flash via **inline background** + **`transition`** and **`FLASH_CLEAR_MS` 600ms**; **`data-live-flash`** on rows. **`liveTickerRow*`** class names are present but **no matching stylesheet** in-repo—styling is inline. Same store selector pattern; **no** engine/tick imports (`src/components/marketDashboard/LiveTickerPanel.tsx`). **Not** currently composed into `MarketDashboard`—available for other shells or consolidation.

## Coordination / rules (already in repo)

- **`AGENTS.md`** and **`.cursor/rules/feature-market-store.mdc`** point editors at **`crew-orbit/feature-build-live-ticker-panel/design/design-spec.md`** for panel boundaries (store-only data, no per-panel tick loops).

## How to verify (for the next human/agent)

- **Unit / component tests:** `src/components/marketDashboard/TickerPanel.react.test.tsx`, `src/components/marketDashboard/LiveTickerPanel.acceptance.test.tsx` (store `applyMarketTick`, flash attributes/classes, list rendering).
- **Manual:** Run the app shell that renders `MarketDashboard`; confirm list tracks `prices`, flashes on up/down ticks driven by the shared tick controller.

## Follow-ups

- Product may want **one** canonical ticker UI: design spec flags duplication risk between **`TickerPanel`** and **`LiveTickerPanel`**—pick a single metaphor or explicitly assign each to a route/layout.
- If **`LiveTickerPanel`** should appear in the main dashboard, wire it in **`MarketDashboard`** (or replace **`TickerPanel`**) in an implement pass—not done here.
- **`TickerPanel`** prints raw numeric **`prices[sym]`**; **`LiveTickerPanel`** uses **`toFixed(2)`**—align formatting if both stay user-visible.
