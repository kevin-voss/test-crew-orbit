# Claude Code Rules – Monorepo

## Working in This Monorepo
- **Each project is independent**: Always `cd project-name` before starting tasks
- **No root-level build** – each project manages its own dependencies and configuration
- **Check `package.json`** before starting: see available scripts and understand the project's dependencies

## Project Structure
- **Monorepo**: Multiple independent projects (mixed languages)
  - **NPM + Vitest projects** (Node.js, vitest test runner):
    - `email-builder/` – Email builder with live preview
    - `habit-tracker/` – Habit tracking app
    - `markdown-notes-app/` – Markdown-based notes
    - `mini-expense-tracker/` – Expense tracking app
    - `personal-todo-app/` – Personal todo list
    - `weather-dashboard/` – Weather information display
  - **NPM + Vite projects** (React, Tailwind, no vitest):
    - `fitness-tracker/` – Fitness tracking app (Zustand store with hardened input guards)
    - `cat-feeding-tracker/` – Cat feeding tracker (bun package manager)
  - **HTML/CSS/JS (no build system)**:
    - `chat-app-demo/` – Chat application demo (plain HTML/CSS/JS)
    - `flashcard-quiz-app/` – Quiz flashcard application
    - `tic-tac-toe/` – Tic Tac Toe game (plain HTML/CSS/JS)
    - `fitness-app/` – Fitness app with logger and timer (plain HTML/CSS/JS)
  - **Polyglot projects**:
    - `live-streaming-chat/` – Java backend (Maven) + Node.js frontend (Vite)
  - **Python projects**:
    - `html-pdf-converter/` – HTML to PDF converter

## Testing & Builds
- **NPM projects**: Test with vitest (config in `vitest.config.js`)
- **HTML/CSS/JS projects**: No build system or tests
- **Do NOT run**: `npm test`, `vitest run`, `npm install`, or other test/build/install commands during any task
- **Do NOT start**: servers, watchers, or long-lived processes

## State Management & Input Guards
- **fitness-tracker** uses **Zustand** for state management (see `src/store/`)
  - Pattern: Input guards protect store mutations (type validation, null checks, deduplication)
  - Example: `addWorkout()` rejects non-objects and duplicate IDs; `updateWorkout()` strips `id` field
  - Tests validate robustness against invalid inputs (adversarial cases)
  - When adding store methods, include guards at boundaries (reject invalid state before mutating)

## File References
- Use format: `path/to/file.js:line_number` when referencing code

## Before Implementing
- **Ask questions first**: Use AskUserQuestion for ambiguous requirements, multiple valid approaches, or architectural decisions
- **No time estimates**: Avoid phrases like "this will take X minutes/hours" – focus on what needs to be done
- **Plan complex tasks**: Use TodoWrite to track multi-step or multi-file work
- **Read code first**: Always read files before proposing changes; don't suggest modifications to unseen code

## Code Changes
- **Favor simplicity**: avoid over-engineering, premature abstractions, or gratuitous refactoring
- **No breaking changes**: maintain backwards compatibility unless explicitly requested
- **Validate at boundaries**: only at user input or external APIs, not internal code
- **Delete unused code**: don't leave `_renamed` or `// removed` comments; clean removal only

## Documentation
- Add comments only where logic is non-obvious
- No docstrings unless essential
- Update nearby docs if files change significantly
