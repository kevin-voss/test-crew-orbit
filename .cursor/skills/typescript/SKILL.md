---
name: typescript
displayName: TypeScript
description: Strict TypeScript practices for safer refactors. Use when editing `.ts`/`.tsx`, typing APIs, or reducing `any`.
allowed-tools:
  - Read
  - StrReplace
metadata:
  creworbit:
    skillSlug: typescript
    category: frontend
    contentHash: f8fb04881dca2617e1d3dd6c843a8f3820a3abd2bb98dedb1dce2b78eafac6f4
    bodyVersionId: KlT.dpofSPPr7XLLN36mwKd7dhMY1flH
---


# TypeScript practices

Use this skill to make TypeScript code explicit, refactor-friendly, and easy to reason about. Types should document real domain rules, not hide uncertainty.

## Core principles

- Prefer simple, local types that match the domain language.
- Use `unknown` instead of `any` at unsafe boundaries, then narrow with guards or schemas.
- Model variants with discriminated unions rather than optional fields that may or may not exist.
- Keep API boundary types shared or generated when possible. Do not duplicate request and response shapes by hand.
- Avoid clever generic abstractions until repeated concrete code proves the need.
- Let strictness catch bugs. Do not silence compiler errors with assertions unless you can prove the invariant.

## Clean architecture

- Keep domain types near the feature that owns them.
- Put reusable primitives in shared modules only when multiple features already need them.
- Convert external data into trusted internal shapes at the boundary.
- Keep UI props smaller than backend DTOs. Components should receive exactly what they render or handle.
- Do not leak transport details such as raw API payloads, query params, or HTTP response wrappers deep into the app.

```ts
type RunStatus = "queued" | "running" | "failed" | "completed"

type RunSummary = {
  readonly id: string
  readonly title: string
  readonly status: RunStatus
}
```

## Type patterns

- Use discriminated unions for state machines, async states, and result variants.
- Use `readonly` and `as const` for immutable configuration and lookup data.
- Use branded or clearly named string types for identifiers when accidental swaps are likely.
- Use `satisfies` to validate object shape while preserving narrow literal types.
- Prefer explicit return types on exported functions, hooks, and public utilities.
- Avoid broad `Record<string, unknown>` types inside domain code. Narrow early.

```ts
type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string }

function renderState(state: LoadState<User>) {
  switch (state.status) {
    case "success":
      return state.data.name
    case "error":
      return state.message
    default:
      return null
  }
}
```

## Runtime boundaries

- TypeScript does not validate runtime data. Validate user input, API responses, local storage, and environment variables when they cross into trusted code.
- Prefer the project's established validation library or plain type guards for small shapes.
- Never cast untrusted JSON directly to a domain type.
- Keep parsing separate from business logic so invalid data fails early and clearly.

```ts
function isRunStatus(value: unknown): value is RunStatus {
  return value === "queued" || value === "running" || value === "failed" || value === "completed"
}
```

## Code quality rules

- Do not use `as any`, double casts, or non-null assertions to move faster. Fix the type or add a real guard.
- Avoid boolean parameter traps. Prefer named options objects when a function has multiple knobs.
- Keep generics understandable. If the call site needs type gymnastics, the abstraction is probably too complex.
- Make impossible states impossible through types.
- Keep nullability explicit. Prefer `undefined` for optional fields unless the API contract uses `null`.

## Testing

- Test runtime guards and parsers with valid and invalid examples.
- Test utility functions near the implementation file.
- Use type-level tests only for shared type utilities where runtime tests cannot prove behavior.

```bash
bun test src/features
bun test src/shared
```

## Risk management

- When changing shared types, search all consumers and update the full flow.
- Check serialization and deserialization paths before renaming fields.
- Be careful with generated API types: regenerate from the source contract instead of editing generated output.
- Treat a new `any` as a temporary escape hatch that needs immediate justification or removal.
