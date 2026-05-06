## Summary

Design guidance for the **market tick controller** reflects **TypeScript + Zustand + Vitest + React** with **no** Tailwind, Radix, or shadcn in this checkout. The tick layer is **lifecycle and store orchestration**, not UI. The spec documents **one tick entry** at the shell, **hydration-aware start**, **shared `useMarketStore` reads** for all panels, spacing **4→32px**, **Ivory Studio** as docs-only reference, and **Uncodixify** constraints—aligned with sibling persisted-store and GBM specs. **`Dashboard`** and **`MarketDashboard`** both use **`useMarketTickController`** from **`src/market/`**, each mounting it **once**.

## Questions for User

- None blocking.

## Changes Made

- **`crew-orbit/feature-add-market-tick-controller/design/design-spec.md`** — Merged discovery and UX guidance (dual integration paths, single mount per shell).
- **`crew-orbit/feature-add-market-tick-controller/ux-designer/role-output.md`** — This delivery summary and handoff JSON.

## Confidence

Score: 92

Reason: Stack and layout verified in-repo; host-app styling remains unknown until merge.

## Recommendations

- **Developer:** Keep **one** `useMarketTickController` invocation per owning route/layout; verify **cleanup** on unmount.
- **QA:** Confirm **no** child panel timers and **synchronized** panel updates from one store commit per tick.
- **Future host repo:** Repeat **design discovery** before adopting a component library.

## Handoff

```json
{
  "status": "success",
  "confidence": 0.92,
  "summary": "Design-spec for market tick controller: no controller-level UI; single shell mount; unified store-driven refresh; 4–32px spacing; Uncodixify + Ivory Studio docs reference; Dashboard and MarketDashboard both use src/market/useMarketTickController.",
  "artifacts": [
    "crew-orbit/feature-add-market-tick-controller/design/design-spec.md",
    "crew-orbit/feature-add-market-tick-controller/ux-designer/role-output.md"
  ],
  "risks": [
    "Host SPA may differ after merge — repeat discovery for tokens and layout.",
    "Tick start vs persistence rehydration follows product rules, not UX alone."
  ],
  "nextStepHint": "Developer verifies hook wiring and store-only updates; QA validates cadence and absence of duplicate tick logic in UI."
}
```
