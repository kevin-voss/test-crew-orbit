# Design Spec — Trading Terminal

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **React** (peer), **Zustand**, **Vitest**, **TypeScript**. **No** Tailwind, shadcn/ui, Radix, or other UI kits. |
| `.cursor/rules/feature-market-store.mdc` | Sandbox UI uses **plain React** styling unless a future **host** app already ships another stack — then remap to host tokens after merge. Panels consume **`useMarketStore`** only; **no** tick/timer logic inside the terminal component. |
| `src/components/marketDashboard/TradingTerminal.tsx` | Reference implementation pattern: `<section aria-label="Trading terminal">`, **native** `<fieldset>` + radio buttons for Buy/Sell, **native** `<input type="number">` and **`type="button"`** submit, **`role="status"`** / **`aria-live`** for validation and Max Buy hint. Ivory/stone palette inline (`#fafaf9`, `#e7e5e4`, `#1c1917`, muted labels `#44403c` / `#57534e`). |
| `src/components/marketDashboard/LiveTickerPanel.tsx` | Same neutrals + **tabular numerals** for prices; **8px** row gap; **8px** border radius on rows — terminal panel should stay visually sibling-consistent. |
| `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md` | **4 / 8 / 12 / 16 / 24 / 32px** scale; hydration-sensitive controls; trading reads as **tooling**, not marketing. |
| `src/components/MarketDashboard.tsx` | **`useMarketTickController`** mounted **once** on shell; **`TradingTerminal`** is a sibling panel — no duplicate tick hooks in the terminal. |

**Conclusion:** Specify **semantic HTML + inline or small scoped CSS** consistent with existing dashboard panels. **Do not** introduce shadcn, Radix, or Tailwind from this feature in this checkout. After host merge, re-express colors and spacing as host design tokens without changing UX contracts (labels, keyboard flow, announcements).

---

## Component suggestions

| Element | Guidance |
|---------|----------|
| Root | **`<section>`** with `aria-label="Trading terminal"` and stable **`data-testid="trading-terminal"`** for QA. Treat as one **focused card** (~tool panel), not a hero. |
| Action selector | **`<fieldset>`** with **`<legend>`** (“Action”). **Radio** inputs for **Buy / Sell** with adjacent **`<label>`** (existing pattern); **keyboard** navigable native controls only. Optionally wrap radios in **`role="radiogroup"`** on a containing element if legends don’t suffice for SR mapping — preserve current fieldset semantics. |
| Quote block | Plain **definition-style rows**: **Cash**, **Symbol** (from **`selectedTicker`**), **Price** (live from store for selected symbol). Use **tabular numerals** on **Price** and **Cash** (`font-variant-numeric: tabular-nums`). Format price to **two decimals**. |
| Max buy | Shown **only when** action is Buy, symbol selected, and a finite positive price exists. Copy pattern: **`Max buy: N shares`** inside **`aria-live="polite"`** so updates from tick-driven price/cash changes are announced without stealing focus. |
| Sell context | When action is Sell, surface **Shares held** for **`selectedTicker`** (whole-share simulation). Mirrors Max Buy usefulness without inventing decorative metrics. |
| Quantity | **`<label>`** + **`type="number"`**, `inputMode="numeric"`, **`min={1}`**, **`step={1}`**; full-width field inside panel with **compact** vertical padding (**8px** vertical, **10px** horizontal). |
| Primary action | **`type="button"`** (**not** submit) **solid** button: enabled = dark fill (**`#1c1917`**) on light text (**`#fafaf9`**); disabled = muted fill (**`#a8a29e`**), **`cursor: not-allowed`**, **`aria-disabled`** when disabled — match existing terminal styling intent. Dynamic label: **“Place buy”** / **“Place sell”**. |
| Empty / blocked symbol | Single **muted paragraph** (`#57534e`) when **`selectedTicker`** is null: instruct user to pick a symbol (downstream wiring may attach selection to ticker list **`setSelectedTicker`**). No illustrations. |
| Validation / errors | **`role="status"`**, **`aria-live="polite"`**, **`aria-atomic="true"`** for error strings; destructive text color (**`#b91c1c`**), ~**13px** — calm, no alert banners unless host provides them. |

**Explicit non-recommendations (Uncodixify):** No KPI cards, donut charts, glass panels, cyan/gradient chrome, eyebrow labels, uppercase tracked labels, **20px+** radius, dramatic shadows, or **transform** animations on submit. Numbers update **instantly** from store — no flashy count-up effects.

---

## Spacing tokens

Align with persisted-market-store and live ticker scale; prefer **multiples of 4px**.

| Token | Value | Trading terminal usage |
|-------|-------|-------------------------|
| space-2 | **8px** | Gap between **radio** label and control; **margin-bottom** under **legend**; **column `gap`** inside the form stack (**prefer 8 over 10** for strict scale consistency). |
| space-3 | **12px** | **Space below** instructional copy; **margin-top** above error/status block. |
| space-4 | **16px** | **Outer padding** of the section (`padding: 16px`); **vertical margin** from adjacent dashboard regions (`margin: 16px 0`). |
| space-5 / space-6 | **24 / 32px** | **Between major dashboard strips** only (shell composes); not needed inside compact terminal. |

**Inner form:** Match **quantity input** padding **8 × 10px** (already aligns to scale). **Radio row:** **16px** horizontal gap between Buy and Sell labels is acceptable (space-4).

---

## Design system alignment

**Typography**

- **Family:** System / inherited stack (**do not** add Inter, Roboto, or Arial unless the host app already does).
- **Body:** **14px** primary; **13px** for error line.
- **Weights:** **600** for legend and primary button label; **500** quantity label; metadata labels **regular** with muted color **#44403c**.

**Colors (reuse project-first)**

Reuse **existing** ticker/terminal neutrals:

- Surface: **`#fafaf9`**; border: **`#e7e5e4`** (section) / **`#d6d3d1`** (input).
- Primary text / symbol emphasis: **`#1c1917`**.
- Muted instructional: **`#57534e`**; secondary label: **`#44403c`**; placeholder/missing quote: **`#78716c`**.
- Error: **`#b91c1c`**.

Avoid introducing new accent hues for trading — buy/sell is encoded by control state and button label, not by red/green button fills.

**Borders, shadows, radii**

- **Section card:** **`1px`** border; **radius 8px** (within **8–12px** card guidance).
- **Inputs / button:** radius **6–8px** (max **10px** per tooling norm); **solid** button fills.
- **Shadows:** **none** on this panel — border + flat fill only.

**Motion**

- **none** beyond what the ticker already uses elsewhere; terminal does not animate on trade success.

---

## Layout notes

- **Dashboard order** (reference): **`LiveTickerPanel`** → **`TradingTerminal`** → chart/analytics panels — terminal sits where users see quotes then act; keep **readable width** (**`max-width` ~420px**) so the form stays a tight column, not a stretched marketing band.
- **Symbol selection UX:** Behavior must stay bound to **`useMarketStore`** — **`cash`**, **`prices`**, **`positions`**, **`selectedTicker`**, **`applyTradeResult`** only. Selecting a symbol is a **coordination concern** between ticker UI and **`setSelectedTicker`**; the terminal displays read-only symbol text and reacts to selection changes (**no external APIs**).
- **Tick sync:** Quote and Max Buy derive from **current** simulated price in store at render / submit (**no** stale client-only mock price).
- **Persistence:** Portfolio and cash persist via store middleware; UX should tolerate **hydration timing** — if shell later exposes a hydration flag, neutralize/disabled-trade state until persisted session is applied (aligned with persisted-store AC-3 narrative).
- **Responsive:** Same **single-column** stack on narrow screens; tap targets **≥ 44px** height preferred for quantity + button on touch (optional tightening of padding).

---

## Handoff note for developers

Trading logic stays **client-only**: validate whole shares and caps (**Max Buy** / holdings) against **live** store price at submit. Preserve **presentation vs. domain** separation: **`applyTradeResult`** on the store is the sole writer for **`cash`/`positions`/history** updates used by charts and analytics. Do **not** mount **`useMarketTickController`** inside this component.
