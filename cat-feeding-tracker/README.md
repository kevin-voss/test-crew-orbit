# Cat feeding tracker

Frontend-only React app (Vite + Tailwind + shadcn-style UI). No backend.

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node + npm

## Setup

```sh
cd cat-feeding-tracker
bun install
```

## Commands

- `bun run dev` — local dev server (Vite)
- `bun run build` — production build to `dist/`
- `bun run preview` — preview the production build

With **npm**, ensure devDependencies install (e.g. default shell `NODE_ENV`, or `npm install --include=dev`), then `npm run build`.

## Layout

- `src/components/form/` — feeding form (scaffold)
- `src/components/history/` — history list (scaffold)
- `src/components/shared/` — shared chrome
- `src/components/ui/` — shadcn-style primitives
