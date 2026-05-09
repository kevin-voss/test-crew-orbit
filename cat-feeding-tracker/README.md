# Cat feeding tracker

Frontend-only React app (Bun + Vite + Tailwind + shadcn/ui primitives). No backend or server-side data fetching.

## Prerequisites

- [Bun](https://bun.sh) (install globally). Lockfile is `bun.lock`; use Bun for installs so dependency graphs stay aligned.

## Setup

```sh
cd cat-feeding-tracker
bun install
```

## Commands

- `bun run dev` — local dev server (Vite SPA)
- `bun run build` — production build to `dist/`
- `bun run preview` — preview the production build

## Layout

- `src/components/form/` — feeding form (scaffold)
- `src/components/history/` — history list (scaffold)
- `src/components/shared/` — shared chrome
- `src/components/ui/` — shadcn/ui primitives (`components.json`)
