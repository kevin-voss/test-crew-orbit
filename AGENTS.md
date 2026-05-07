# Agent notes (test-crew-orbit)

Short context for humans and coding agents working in this repository. Cursor-specific rule snippets live under **`.cursor/rules/`**; detailed playbooks live under **`.cursor/skills/`**.

## Product stack

- **Next.js 15** with the App Router (`src/app/`), **React 18**, **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for client state (`src/stores/`)
- **Recharts** for charting
- **Vitest** and **Testing Library** for tests (`tests/`)

## Tooling

- **Package manager:** npm (root **`package-lock.json`**). Use **`package.json` scripts** as the source of truth for dev, build, lint, typecheck, and test.
- **Lint / types:** ESLint flat config (`eslint.config.mjs`); TypeScript via `tsconfig.json`.

## Where to look

| Area | Location |
|------|----------|
| App routes & layout | `src/app/` |
| UI & features | `src/components/`, hooks in `src/hooks/` |
| Domain / engine helpers | `src/utils/`, `src/types/` |
| Tests | `tests/` |
| Cursor rules | `.cursor/rules/*.mdc` |
| Cursor skills | `.cursor/skills/*/SKILL.md` |

## Skills vs this repo

Skills under `.cursor/skills/` may mention **Bun** or other tools. **This clone uses npm and `package-lock.json` unless the project is explicitly migrated**—follow root `package.json` and the stack rule in `.cursor/rules/stack-and-workflow.mdc`.
