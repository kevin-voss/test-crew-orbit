# AI config setup (Cursor)

## Files touched (3)

| Path | Change |
|------|--------|
| `.cursor/rules/feature-market-store.mdc` | Stack line now matches **Next.js App Router**, **Tailwind** shell, **Recharts** (from shallow `package.json` / responsive-layout spec). **Boundaries** corrected: Tailwind is in-repo; still **no** Radix/shadcn. Added **responsive dashboard layout** spec link, short **Responsive dashboard layout** section (single tick mount, semantic layout / `data-testid`, `max-w-[1920px]`). Live ticker + trading terminal bullets aligned with “no new UI kits” vs. prior “no Tailwind” wording. |
| `AGENTS.md` | Intro lists **Next.js**, **Tailwind**, **Recharts**. **Before coding** adds **Responsive dashboard layout** with one-line scope (route + `MarketDashboard`, Tailwind shell, tick once on shell). |
| This file | Session summary for humans. |

No `.cursor/commands`, `hooks/`, or `skills/` existed — not added. **`.gitignore`:** unchanged (no new generated AI artifact dirs required).

## Follow-ups for humans

- If you add more Cursor rules (e.g. Next-only routing), keep **one** market-domain rule as the single source for store/tick/panel boundaries; link from frontmatter `description` / globs instead of duplicating AGENTS.md.
- ECC / rule packs: verify they don’t contradict “Tailwind on shell, plain React in panels” — this repo’s responsive-layout design spec is the tie-breaker.
