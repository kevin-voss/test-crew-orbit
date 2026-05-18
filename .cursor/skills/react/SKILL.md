---
name: react
displayName: React
description: Applies React best practices for components and hooks. Use when implementing or refactoring React UI,
  hooks, state, or client/server boundaries in React apps.
allowed-tools:
  - Read
  - StrReplace
metadata:
  creworbit:
    skillSlug: react
    category: frontend
    contentHash: 410bb9ba858c71e6e870a935b831b9c51901ddb915c80192219af4f27aaf155a
    bodyVersionId: 7V9LVdAgNQDc4pSHr.hnH4xZeWGnpjCx
---


# React best practices

Use this skill to write React that is simple to read, easy to test, and boring to maintain. Prefer clear data flow over clever abstractions.

## Core principles

- Build "stupid" presentational components by default: typed props in, JSX out, no fetching, no routing, no hidden global state.
- Put behavior in custom hooks when it is more than trivial UI state. Components should describe the screen; hooks should coordinate state, events, data fetching, and derived values.
- Keep helpers close to where they are used. Use feature-local `utils/`, `hooks/`, and `components/` folders before introducing shared abstractions.
- Co-locate tests with the code under test: `Component.test.tsx`, `useThing.test.ts`, `formatThing.test.ts`.
- Avoid complex architecture. If a plain component, hook, and utility solve the problem, do not add state machines, global stores, providers, or service layers.
- Minimize `useEffect`. Prefer event handlers, derived values, TanStack Query, route loaders, form libraries, or component props. Use effects only to synchronize with external systems.

## Component structure

- One component should have one job. Split a component when it mixes layout, data loading, form rules, and mutation handling.
- Keep containers thin. A good pattern is `FeaturePage` -> hook -> presentational components.
- Prefer explicit props over passing large objects when only a few fields are needed.
- Use semantic HTML first: `button`, `form`, `label`, `nav`, `main`, `section`.
- Keep rendering branches readable. Extract named booleans or small components when JSX becomes hard to scan.
- Do not memoize everything. Use `memo`, `useMemo`, and `useCallback` only for measured performance problems, stable provider values, or expensive calculations.

```tsx
type UserCardProps = {
  name: string
  email: string
  onInvite: () => void
}

export function UserCard({ name, email, onInvite }: UserCardProps) {
  return (
    <article>
      <h3>{name}</h3>
      <p>{email}</p>
      <button type="button" onClick={onInvite}>Invite</button>
    </article>
  )
}
```

## Hooks and clean flow

- Hooks should expose intent: `useInviteMember`, `useProjectFilters`, `useRunTimeline`.
- Return named values and event handlers; avoid returning positional arrays except for very small internal hooks.
- Keep hook dependencies stable and honest. Do not suppress hook lint rules to hide design problems.
- Put transformation logic in pure utilities when it can be tested without React.
- Use `useEffect` for subscriptions, imperative third-party APIs, timers, browser APIs, and cleanup. Do not use it to copy props into state or compute derived values.

```tsx
export function useMemberSearch(members: Member[]) {
  const [query, setQuery] = useState("")

  const filteredMembers = useMemo(
    () => filterMembers(members, query),
    [members, query],
  )

  return { query, setQuery, filteredMembers }
}
```

## State management

- Keep state as local as possible. Lift state only when multiple siblings need to coordinate.
- Store the minimum state needed. Derive everything else during render.
- Use TanStack Query or the project's data-fetching standard for server state. Do not mirror server data into local state unless editing a draft.
- Use context sparingly for cross-cutting state such as auth, theme, permissions, or feature-level coordination.
- Avoid global stores for one-screen problems.

## File organization

```text
features/members/
  components/
    MemberCard.tsx
    MemberCard.test.tsx
  hooks/
    useMemberSearch.ts
    useMemberSearch.test.ts
  utils/
    filterMembers.ts
    filterMembers.test.ts
  types.ts
```

## Accessibility and UX

- Every input has an accessible label and validation message.
- Interactive elements are reachable by keyboard and have visible focus states.
- Dialogs, menus, popovers, and drawers manage focus and announce titles.
- Loading and error states are explicit. Do not leave screens blank while async work is pending.
- Prefer user-facing text in tests: role, label, placeholder, and visible name.

## Testing

- Test pure utilities with fast unit tests.
- Test hooks with focused hook/component tests when behavior is non-trivial.
- Test components through user interactions, not implementation details.
- Mock network boundaries, not the component internals.
- Cover loading, empty, success, error, and permission states for user-facing flows.

```bash
bun test src/features/members
bun test MemberCard.test.tsx
```

## Risk management

- Before adding a dependency, check whether the app already has an equivalent component, hook, or utility.
- Keep refactors behavior-preserving unless the task explicitly changes behavior.
- Watch for stale closures, double submission, lost form edits, and race conditions after async mutations.
- Treat accessibility regressions as functional bugs.
- When changing shared components, run the narrow feature tests first, then broader tests for affected screens.
