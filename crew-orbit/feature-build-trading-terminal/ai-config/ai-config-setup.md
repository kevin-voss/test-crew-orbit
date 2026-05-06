# AI config setup (Cursor — trading terminal alignment)

## Inventory (allowed paths only)

| Path | Contents |
|------|----------|
| `.cursor/rules/` | Single rule file: `feature-market-store.mdc` (globs `src/**/*.ts{x}`). No `commands/`, `hooks/`, or `skills/` under `.cursor/` in this repo today. |
| Root `AGENTS.md` | Short canonical pointers to feature design specs + stack. |

Summary file location: **`crew-orbit/feature-build-trading-terminal/ai-config/ai-config-setup.md`** (under this checkout). If your machine maps the repo differently from `/workspace/kevin-voss--test-crew-orbit`, use the same path relative to the repo root.

## Files touched (3)

1. **`AGENTS.md`** — Added one bullet under “Before coding” for the trading terminal design spec (`crew-orbit/feature-build-trading-terminal/design/design-spec.md`), consistent with existing market-feature pointers.
2. **`.cursor/rules/feature-market-store.mdc`** — Extended description/title for trading terminal usage; linked the trading-terminal spec in the specs list; added a concise **Trading terminal (UI)** section (shell-only tick, store-driven data, a11y/test-id contracts); included `TradingTerminal` in the passive-panels bullet so tick/timer rules cannot drift.
3. **`crew-orbit/feature-build-trading-terminal/ai-config/ai-config-setup.md`** — This file.

## What did *not* change

- No new `.cursor` commands, hooks, or skills (none present to extend).
- **`.gitignore`** — Unchanged (no obvious generated AI artifact path missing; `node_modules/` and `dist/` already ignored).
- No implementation, install, build, lint, or test commands were run during this step.

## Follow-ups for humans

- If Cursor project rules split by feature later, extract a slim `feature-trading-terminal.mdc` with the same globs—or keep the single consolidated rule as now if overlap stays high.
- Add `.cursor/commands/` only when the team adopts repeatable prompts or checklists worth versioning.
