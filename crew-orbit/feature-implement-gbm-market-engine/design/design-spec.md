# Design Spec

## Discovery (completed)

| Source | Finding |
|--------|---------|
| Root `package.json` | **`zustand`**, TypeScript, **Vitest** only as runtime/dev tooling. **`react`** is peer/dev typing support—no Tailwind, Radix, shadcn, Recharts, or other UI/DX packages declared. |
| `src/utils/marketEngine.ts` | GBM stepping, injectable RNG, **`MARKET_ENGINE_HISTORY_MAX` = 100**, `DEFAULT_MARKET_ENGINE_PARAMS` for **AAPL / TSLA / AMZN** with distinct **`μ`** and **`σ`**. Output aligns with **`MarketTickPayload`** and rolling **`PricePoint`** series (`t`, `price`). |
| `src/stores/market/types.ts` | **`PricePoint`**: `{ t: number; price: number }`. **`historySamples`** on tick payload is the append contract for chart continuity. |
| `.cursor/rules/feature-market-store.mdc` | State layer stays free of UI imports; host app owns presentation after merge—**repeat discovery** on the real app for components and tokens. |
| `AGENTS.md` | Coordination checkout; implementation may align with sibling **persisted market store** UX intent. |
| `crew-orbit/feature-set-up-persisted-market-store/design/design-spec.md` | Established **spacing scale (4→32px)** and Uncodixify-aligned guidance for downstream trading/dashboard UI—**reuse for consistency.** |

**Conclusion:** This feature is **`/utils/marketEngine.ts`-only**. There are **no new screens or components** in scope. Guidance below informs **consumers** (market controller → store → any future chart/price displays) so visuals stay coherent with the broader market feature family.

---

## Component Suggestions

**GBM utility (this task)**  
- **No UI components.** Do not embed chart primitives, loaders, or layout inside `marketEngine.ts`.

**Consumers that will surface prices or the 100-point history (later / host app)**  

| Concern | Guidance |
|---------|----------|
| Price displays | **Dense inline text or table cells**—use host typography; **tabular numerics** (`font-variant-numeric: tabular-nums`) for aligned decimals. |
| Selected symbol vs list | Prefer **existing** picker/table from host; **native `<select>`** if no kit—do **not** add shadcn/Radix **unless** already in the downstream repo (not present here). |
| Mini series / sparkline strip | Prefer **minimal line or step plot** tied to **`PricePoint.t`** ordering—**no decorative axes, gradients, donut charts, or fake analytics chrome** (Uncodixify). If no chart library: a **narrow sparkline SVG** or **last-N numeric strip** beats a heavy dashboard widget. |
| Tick feedback | Prefer **immediate value updates** with no transform-heavy motion on numbers or series. |

---

## Spacing Tokens

Reuse the **single scale** from the persisted market store design spec (aligned with task constraints):

| Token | Value | Typical use |
|-------|-------|-------------|
| `space-1` | **4px** | Tight gaps between ticker badge and price |
| `space-2` | **8px** | Inline controls, compact table padding |
| `space-3` | **12px** | Stacked labels + values in a row |
| `space-4` | **16px** | Panel interior padding |
| `space-5` | **24px** | Gap between price block and chart strip |
| `space-6` | **32px** | Page edge margins |

**Tailwind / CSS variables:** Not defined in this repo. When integrated, map to the **host’s** spacing scale; if it already uses default Tailwind, `gap-1`≈4px through `gap-8`≈32px **only if** that matches existing usage.

---

## Design System Alignment

**Typography**  
- Follow the **host app** stack; **14–16px body** for live prices and history metadata.  
- **No** introduction of Inter/Roboto/Arial/Segoe unless already configured upstream.

**Colors**  
1. **First:** Host semantic tokens (`foreground`, `muted-foreground`, `border`, `chart-1`… if present).  
2. **Fallback (documentation only):** **Ivory Studio** light reference—background `#f5f5f4`, surface `#fafaf9`, primary `#0891b2`, secondary `#06b6d4`, accent `#f59e0b`, text `#1c1917`—for moodboard alignment; avoid hard-coding in the engine.

**Per-symbol differentiation (AAPL, TSLA, AMZN)**  
- **Mathematical** distinction is via **`μ` and `σ`** in the engine; **UI** should rely on **clear labels** and, if multi-series charts exist, **distinct, calm series colors** from the host palette (not cyan-on-blue gradients).

**Borders, shadows, radii**  
- **Cards/panels:** `1px` border, **8–12px** radius max.  
- **Buttons (elsewhere):** **8–10px** radius, solid fills.  
- **Shadows:** minimal—**no** large diffuse elevation.  
- **Sidebars:** **240–260px**, solid fill if a shell exists later.

---

## Layout Notes

- **Data contract for UI:** Each tracked symbol may expose up to **100** `{ t, price }` samples; newest points monotonically usable for a **horizontal time axis** (`t` in ms). Controllers invoking the engine on a **~2s** cadence should expect **steady append** semantics, not full reload animations.  
- **Separation:** Keep GBM math and history clamping **only** in `marketEngine.ts`; the **market controller** bridges ticks to the store; **no** coupling to dashboard folders (aligns with existing test intent).  
- **Density:** Any future strip showing three symbols should read as a **tool panel**—single row or stacked blocks with **16–24px** vertical rhythm, not a marketing “market overview” hero.  
- **Responsive:** On narrow viewports, stack **symbol → price → sparkline/history hint** vertically; avoid hover-only disclosure for current price.
