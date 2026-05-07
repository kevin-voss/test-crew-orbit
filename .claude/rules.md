# Claude Code Rules – Monorepo

## Project Structure
- **Monorepo**: Multiple independent projects in root directories
  - `mini-expense-tracker/` – JS/TS app, vitest, no build step
  - `habit-tracker/` – JS/TS app, vitest, no build step
  - `personal-todo-app/` – JS/TS app, vitest, no build step
  - `markdown-notes-app/` – JS/TS app, vitest, no build step
  - `weather-dashboard/` – JS/TS app, vitest, no build step
  - `flashcard-quiz-app/` – JS/TS app, vitest, no build step

## Testing & Builds
- **Test runner**: vitest (config: `vitest.config.js` in each project)
- **No root-level build** – each project is independent
- **Do NOT run** `npm test`, `vitest run`, or other test/build commands during configuration tasks

## File References
- Use format: `path/to/file.js:line_number` when referencing code

## Code Changes
- **Favor simplicity**: avoid over-engineering, premature abstractions, or gratuitous refactoring
- **No breaking changes**: maintain backwards compatibility unless explicitly requested
- **Validate at boundaries**: only at user input or external APIs, not internal code
- **Delete unused code**: don't leave `_renamed` or `// removed` comments; clean removal only

## Documentation
- Add comments only where logic is non-obvious
- No docstrings unless essential
- Update nearby docs if files change significantly
