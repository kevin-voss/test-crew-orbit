---
name: tailwind-css
displayName: Tailwind CSS
description: Tailwind CSS conventions for token-based styling, responsive layout, dark mode, variants, and maintainable
  utility classes.
allowed-tools:
  - Read
  - Grep
metadata:
  creworbit:
    skillSlug: tailwind-css
    category: frontend
    contentHash: 578c86e9bfa546f4bbbc2c1260770842abaf75f81e3069a58f28d93f46c83dfc
    bodyVersionId: MtWb.4CnIKPL_5ulGnss4ZWmlAKJ9_9z
---


# Tailwind CSS

Use this skill to write Tailwind that is consistent, token-driven, responsive, and easy to maintain.

## Core principles

- Prefer design tokens and semantic utilities over raw colors and one-off arbitrary values.
- Use Tailwind for layout and composition; keep component behavior in React or the framework layer.
- Keep class lists readable. Extract components or variants when repeated class strings become noisy.
- Follow the project's Tailwind version and configuration style.
- Use existing component variants before adding custom utility combinations.
- Keep dark mode automatic through tokens when possible.

## Layout and spacing

- Use flex, grid, and gap utilities for layout.
- Prefer `gap-*` over `space-x-*` and `space-y-*`.
- Use `size-*` when width and height match.
- Use `min-w-0` and `truncate` for text inside flex/grid layouts.
- Use container and max-width utilities intentionally for readable content.
- Avoid nested fixed heights and nested scroll containers unless the UX requires them.

```tsx
<div className="flex min-w-0 items-center gap-3">
  <Avatar className="size-10" />
  <span className="truncate text-sm font-medium">Ada Lovelace</span>
</div>
```

## Color and themes

- Use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`.
- Avoid raw colors such as `text-blue-500` for product UI unless they are part of a deliberate brand or data-visualization palette.
- Avoid manual `dark:` overrides when semantic tokens already handle themes.
- Put custom tokens in the existing global CSS or Tailwind theme file for the project.
- Check contrast for text, borders, disabled states, and focus rings.

## Responsive design

- Design mobile and desktop layouts explicitly.
- Use breakpoint prefixes to change layout, not to patch broken spacing.
- Prefer content-aware layouts (`grid-cols-[...]`, `minmax`, wrapping) when fixed breakpoints are brittle.
- Test long labels, localized text, empty data, and dense content.

```tsx
<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {cards.map((card) => (
    <DashboardCard key={card.id} card={card} />
  ))}
</section>
```

## State and variants

- Use `hover:`, `focus-visible:`, `disabled:`, `aria-*`, `data-*`, and group/peer variants for stateful styling.
- Prefer accessible state attributes over duplicating state in class names.
- Use `focus-visible` rings for keyboard focus.
- Keep hover effects subtle and consistent.
- Do not hide disabled controls without explaining why the action is unavailable.

```tsx
<button className="rounded-md px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
  Save
</button>
```

## Class composition

- Use the project's `cn()` helper for conditional classes.
- Put reusable variants in a variant helper when the same style matrix appears repeatedly.
- Avoid string concatenation that can generate invalid or unscannable classes.
- Keep arbitrary values rare and documented by context.

```tsx
<div className={cn("rounded-lg border p-4", isActive && "border-primary bg-primary/5")}>
  {children}
</div>
```

## Tailwind v3 vs v4

- Tailwind v3 commonly uses `tailwind.config.js` or `tailwind.config.ts`.
- Tailwind v4 commonly uses CSS-first configuration with `@theme`.
- Check the existing project before editing theme tokens.
- Do not create a second theme source of truth.

## Risk management

- Watch for purge/content configuration issues when adding new paths or dynamic class names.
- Avoid dynamic class fragments like `text-${color}-500`; use explicit mappings.
- Review dark mode, high contrast, reduced motion, and responsive behavior.
- Keep utility changes scoped. A global token change can affect the whole app.
- Run visual checks for shared component changes.
