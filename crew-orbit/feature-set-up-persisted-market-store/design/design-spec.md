# Design Spec

## Discovery (completed)

| Source | Finding |
|--------|---------|
| `package.json` (feature folder) | Dependencies: **`zustand`**, TypeScript, Vitest only. **No** React, Tailwind, Radix, or shadcn. |
| Planner overview (`plan/00-overview.md`) | Intended downstream: client-only SPA (**likely Vite + React + TypeScript**); paths under `src/stores/market/` are placeholders until merged into the real app repo. |
| Requirements (`spec/requirements.md`) | UI must **consume** `useMarketStore` only (AC-11); persistence and portfolio rules stay in the store layer. Interactive portfolio/market UI must not contradict restored session until rehydration is complete (AC-3). |
| `.cursor/rules`, `AGENTS.md` | Not present in this workspace. |

**Conclusion:** This task is **state-layer only** in the current sandbox. Component recommendations below apply **when** the store is wired into the actual dashboard app—after verifying that app’s real stack (repeat discovery on merge).

---

## Component suggestions

**Store implementation (this task)**  
- No UI components. Do not add presentation imports to the store module.

**Downstream consumers (market controller, trading terminal, dashboard, analytics)—after stack verification**

| Need | Guidance |
|------|----------|
| App shell / hydration gate | Use whatever **loading/skeleton** primitives the host app already uses. If none exist: a single **inline status row** or **muted banner** (“Restoring session…”) is preferable to a full-screen splash. Avoid decorative loaders. |
| Cash, positions, trade list | Prefer **dense tables or definition lists** with existing typography—match GitHub/Linear-style information density, not marketing cards. |
| Trade submission | Primary action = **solid button** (host library’s `Button` if present). Secondary = outline or ghost per existing patterns. |
| Selected ticker / symbol picker | Native `<select>` or the app’s existing combobox—only introduce Radix/shadcn **if the repo already depends on them**. |
| Errors (invalid persistence, storage blocked) | **Inline alert** or simple dialog from the host stack; calm copy, no eyebrow labels or uppercase tracking. |

**Explicit non-recommendations (Uncodixify)**  
- Do not default to KPI/metric-card grids, hero sections inside the dashboard, fake charts, donut “portfolio” visuals, glassmorphism shells, or oversized radii for trading chrome.

---

## Spacing tokens

Use a **single scale** everywhere this feature touches UI:

| Token | Value | Typical use |
|-------|-------|-------------|
| `space-1` | **4px** | Icon gaps, tight inline metadata |
| `space-2` | **8px** | Related controls, table cell padding (compact) |
| `space-3` | **12px** | Form field stacks, list row padding |
| `space-4` | **16px** | Section padding inside panels |
| `space-5` | **24px** | Between major blocks (terminal vs. chart strip) |
| `space-6` | **32px** | Page-level margins (max comfortable rhythm) |

If the host app uses Tailwind: prefer `p-1`/`gap-1` → **4px**, `p-2`/`gap-2` → **8px**, etc., **only if** that matches the repo’s existing spacing map; otherwise define CSS variables once and reuse.

---

## Design system alignment

**Typography**  
- Follow the **host app’s** font stack. Do **not** introduce Inter/Roboto/Arial unless already configured.  
- Body **14–16px** for trading rows and numeric columns; **tabular figures** if the font supports OpenType settings (`font-variant-numeric: tabular-nums`) for aligned decimals.

**Colors (priority order)**  
1. **Use existing** semantic tokens from the host repo (`background`, `surface`, `foreground`, `muted`, `border`, `destructive`, etc.).  
2. If the integrated app has **no** palette yet, use a calm reference only—**Ivory Studio** (light): background `#f5f5f4`, surface `#fafaf9`, primary `#0891b2`, secondary `#06b6d4`, accent `#f59e0b`, text `#1c1917`. Treat as **documentation reference**, not a mandate to hard-code hex in the store.

**Borders, shadows, radii**  
- **Cards/panels:** border `1px` subtle; radius **8–12px** max.  
- **Buttons:** **8–10px** radius max; solid fills.  
- **Shadows:** minimal or none—avoid large diffuse shadows (`0 24px 60px` style).  
- **Sidebars** (when dashboard layout exists): **240–260px** width, solid background—no floating gradient shells.

**Motion**  
- Avoid transform-heavy animations on numbers or charts; preference for instant updates or very subtle opacity transitions only if the host design system already defines them.

---

## Layout notes

- **Separation of concerns:** Keep all persistence and portfolio **state transitions** in `useMarketStore` actions; UI reads selectors and dispatches actions—no parallel `localStorage` writes for the same fields (AC-7).  
- **Rehydration (AC-3):** App shell should know when `persist` has finished (e.g. `onFinishHydration` / `persist.hasHydrated()` per Zustand docs used in-repo). Until then, disable or neutralize controls that could imply a **different** portfolio than the one about to hydrate.  
- **Density:** Trading surfaces should read as **tools**, not marketing pages—single-column or sidebar + main is fine; avoid gratuitous multi-column “dashboard gravitas.”  
- **Responsive:** On narrow viewports, stack terminal → positions → history vertically with **16–24px** gaps; do not rely on hover-only affordances for critical actions.
