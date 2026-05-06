# Design Spec — Live Ticker Panel

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **React** (peer), **Zustand**, **Vitest**, **TypeScript**. **No** Tailwind, shadcn/ui, Radix, or other component libraries. |
| `src/components/marketDashboard/LiveTickerPanel.tsx` | Presentational list: **semantic HTML** (`<ul role="list">`, `<li role="listitem">`), **inline styles** + optional utility classes (`liveTickerRow`, `liveTickerRowGain`, `liveTickerRowLoss`). Subscribes via `useMarketStore`; no tick/timer logic in the panel. |
| Sibling panels (`TickerPanel`, `ChartStripPanel`, `AnalyticsPanel`) | Mostly **unstyled** `<section>` markup—ticker panel is the **densest** visual treatment in this checkout. |
| `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md` | Defines **4/8/12/16/24/32px** spacing scale, **Ivory Studio**–style calm light reference (`#f5f5f4` / `#fafaf9` / `#1c1917`), **8–12px** radii, **tabular numerals**, minimal shadow. |
| `.cursor/rules/feature-market-store.mdc` | UI must consume **`useMarketStore`**; **no** parallel tick sources in panels; repeat discovery after merge into a host app. |

**Conclusion:** Recommend **native list semantics** and **plain React styling** (inline or a small CSS module / class sheet) consistent with the current `LiveTickerPanel` direction. **Do not** introduce shadcn, Radix, or Tailwind from this feature unless the **host** repo already uses them—then remap the same structure to that stack’s tokens.

---

## Component suggestions

| Element | Guidance |
|---------|----------|
| Container | **`<ul>`** with `role="list"` and an accessible name (e.g. `aria-label="Live ticker"`). Avoid wrapper divs that break list semantics unless layout requires one non-list parent. |
| Row | **`<li>`** per symbol; keep **one row = one symbol + one formatted price**. |
| Symbol | **`<span>`** or `<strong>` with **font-weight 600** for hierarchy; no eyebrow label above the symbol. |
| Price | **`<span>`** with **tabular figures** (`font-variant-numeric: tabular-nums`), **two decimal places** for quote display (match existing `toFixed(2)` intent). |
| Flash state | Prefer **background tint** (and optionally **left border accent** 2–3px) driven by transient “up” / “down” state—not scale transforms, not full-screen overlays, not ping animations. Expose `data-live-flash="up" \| "down"` (or clear) for tests and theming hooks. |
| Empty state | If `prices` has no finite numeric entries: **single muted line** inside the list region or an empty list—no decorative placeholder chart. |

**Explicit non-recommendations (Uncodixify):** No KPI cards, hero blocks, gradient strips, glass panels, 20px+ corner radius, or dramatic box shadows for this panel.

---

## Spacing tokens

Align with the **project-wide scale** from the persisted-market-store design spec:

| Token | Value | Use for live ticker |
|-------|-------|---------------------|
| space-1 | **4px** | Tight gap between symbol and price (if not using a single space character). |
| space-2 | **8px** | **Gap between list rows** (`gap` on column flex/stack). |
| space-3 | **12px** | **Vertical padding inside each row**; horizontal padding companion **8px** or **12px** for a compact strip. |
| space-4 | **16px** | **Outer padding** of the list container from the dashboard gutter. |
| space-5 / space-6 | **24px / 32px** | Separation from adjacent dashboard regions when the shell layout is composed (not inside each row). |

**Current implementation anchor:** list padding `12px 16px`, row padding `8px 12px`, inter-row gap `8px`—this already matches the scale; preserve or intentionally adjust in **multiples of 4px** only.

---

## Design system alignment

**Typography**

- **Family:** System / host stack—**do not** add Inter, Roboto, or Arial unless the host app already does (per store design spec).
- **Size:** **14px** body for row content; optional **12px** only for secondary metadata if you add it later (not required for v1).
- **Weight:** **600** symbol; **400** price is acceptable if contrast remains clear.
- **Numbers:** **tabular-nums** always on price.

**Colors (priority)**

1. **Use existing** values from this checkout’s ticker implementation where appropriate: text `#1c1917`, surface `#fafaf9`, border `#e7e5e4` (stone-like neutrals).
2. **Flash — up:** subtle **green** background tint (e.g. emerald family at ~35% alpha); avoid neon cyan accents.
3. **Flash — down:** subtle **rose/red** background tint (~35% alpha); avoid alarming full-row solid fills for the whole duration.
4. After host merge: replace hex/rgba with **semantic tokens** (`success` / `destructive` / `muted` / `card` / `border`) if the app defines them.

**Borders, shadows, radii**

- **Row container:** `1px` border, color matching neutral border token; **border-radius 8px** (max **10px** for buttons elsewhere; tic panel rows stay **8px**).
- **Shadows:** **None** for rows; rely on border + background.
- **Flash accent (optional):** 2–3px **left border** in saturated green/red only while `data-live-flash` is set—keeps the UI readable for color-blind users if combined with background change.

**Motion**

- **Background-color** transition only, ~**120–200ms** ease; **no** `transform`, **no** pulse keyframes, **no** large shadow transitions.
- **Flash duration:** **400–700ms** total hold before returning to neutral (implementation uses **600ms**—keep in that band).

---

## Layout notes

- **Structure:** Single **vertical column**; sort order **lexicographic by symbol** (matches current `listSymbols` behavior) unless product asks otherwise—predictable scan order for tools-style UIs.
- **Density:** Treat as a **read-only strip** (terminal aesthetic): consistent row height, no per-row expand/collapse for v1.
- **Width:** Natural width within parent; prefer **min-width ~200px** so symbol + price do not clip awkwardly on narrow layouts.
- **Responsive:** On small viewports, list stacks with the rest of the dashboard; **no horizontal-only marquee** required—vertical list is the spec.
- **Integration:** Mount **once** as a panel in the dashboard shell; **do not** mount `useMarketTickController` inside this component (tick lives in shell per market-store rules).

---

## Handoff note for developers

Preserve **presentational** boundaries: selectors + render only; **no** `setInterval`, engine imports, or tick controller hooks in this file. Styling may move from inline objects to shared tokens **when** the host app provides them—behavior and accessibility contract should remain equivalent.
