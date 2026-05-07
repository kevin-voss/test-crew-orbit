# Claude Code Guide – Monorepo

Welcome to the monorepo. This guide helps Claude Code work effectively with the project structure and conventions.

## Quick Start

- **Each project is independent**: run `cd project-name` and work within that directory
- **Vitest** is the test runner in each project
- **No root-level build**: each project manages its own dependencies via `package.json`

## Before You Start a Task

Check the `project-name/package.json` to see available scripts and dependencies.

## Code Conventions

See `.claude/rules.md` for detailed guidance on testing, code style, and configuration tasks.
