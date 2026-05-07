# Claude Code Rules — Simple Bun React App

## Project Stack
- **Runtime**: Bun (all-in-one JavaScript runtime)
- **Framework**: React 18 with TypeScript
- **Bundler**: Bun's built-in bundler (via `bun build`)
- **Build output**: `dist/` directory

## Key Files & Patterns
- **Entry point**: `index.tsx` — Main React component
- **HTML template**: `index.html` — Renders to element with id `app`
- **Config**: `bunfig.toml` — Bun build & runtime configuration
- **Scripts**: `package.json` — `dev`, `build`, `start` commands use `bun run`

## Guidelines
1. **TypeScript**: Preserve type annotations; use `.tsx` for JSX files
2. **React components**: Keep them functional; use hooks (useState, useEffect, etc.)
3. **Bun conventions**:
   - Use `bun install` for dependencies (not npm)
   - Bun automatically resolves TypeScript without tsc
4. **Minimal config**: Avoid adding unnecessary build tools or transpilers — Bun handles TS/JSX natively
5. **File changes**:
   - Prefer editing existing files over creating new ones
   - Keep changes focused to the specific task

## Common Commands (read-only reference)
- `bun run dev` — Development mode
- `bun run build` — Production build to `dist/index.js`
- `bun install` — Install/update dependencies

## Notes
- No additional configuration files needed for TypeScript
- `dist/` and `node_modules/` are excluded from source control
