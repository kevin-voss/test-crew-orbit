# AI config setup (Cursor)

**Date:** 2026-05-06  
**Scope:** Cursor rules + shared `AGENTS.md` only (no installs, tests, or builds).

## Files touched (2)

| Path | Change |
|------|--------|
| `.cursor/rules/feature-market-store.mdc` | Narrowed `globs` to `src/**/*.ts(x)` (this repo’s code; `crew-orbit/` here is spec Markdown only). Retitled scope to market store **and** GBM engine; added pointers to both design specs; clarified `marketEngine.ts` stays utility/UI-free; Vitest note includes deterministic engine tests via injectable RNG. |
| `AGENTS.md` | Stated that implementation lives under `src/` with stack from root `package.json`; split “before coding” into persisted-store vs GBM engine spec links; removed “sibling workspace” wording that no longer matches this tree. |

## Not changed

- **`.gitignore`:** No AI-generated artifact paths needed ignoring (`node_modules/` / `dist/` already covered).
- **New rule files / commands / hooks / skills:** None; repo only had this single `.mdc`.

## Follow-ups for humans

- If you add more Cursor affordances (e.g. `commands/`, `hooks/`), mirror the same spec links and `src/`-vs-`crew-orbit/` split from `AGENTS.md`.
- Revisit rule `globs` if implementation moves out of `src/` (e.g. packages layout).

**Note:** Summary path in the task used `/workspace/crew-orbit/...`; in this checkout the file lives at `crew-orbit/feature-implement-gbm-market-engine/ai-config/ai-config-setup.md` under the repository root.
