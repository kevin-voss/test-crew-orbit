---
name: shadcn-ui
displayName: shadcn/ui
description: Practical shadcn/ui guidance for CLI usage, component composition, theming, accessibility, forms, and
  registry workflows.
allowed-tools:
  - Read
  - Grep
  - Bash
metadata:
  creworbit:
    skillSlug: shadcn-ui
    category: frontend
    contentHash: 9ce79ec9b7670eb429a99b323c589de8a9736b49d7aba5bfe05d291efb5ce75d
    bodyVersionId: m5ni0SJiypmKUPaEkf9.KMLkTxBFurWM
---


# shadcn/ui

shadcn/ui is a source-code component system for building UI, components, and design systems. Components are added to the project via the CLI, then owned by the codebase.

## Important

Run CLI commands using the project's package runner:

- `npx shadcn@latest` for npm projects.
- `pnpm dlx shadcn@latest` for pnpm projects.
- `bunx --bun shadcn@latest` for Bun projects.

Examples below use `npx shadcn@latest`; substitute the correct runner from the project's package manager.

## Project context

Always inspect the current shadcn config before making UI decisions:

```bash
npx shadcn@latest info --json
```

Important fields:

- `aliases`: use the actual import aliases; never hardcode `@/`.
- `resolvedPaths`: tells where components, hooks, utils, and CSS live.
- `framework`: affects routing and file conventions.
- `packageManager`: determines install commands.
- `tailwindVersion`: affects theme and CSS variable syntax.
- `tailwindCssFile`: edit this file for tokens; do not create a competing global CSS file.
- `base`: affects component APIs such as `asChild` vs `render`.
- `iconLibrary`: determines icon imports; do not assume `lucide-react`.

## Core principles

- Use existing components first. Check installed components and registries before building custom UI.
- Compose components instead of recreating them with styled `div`s.
- Use component variants before custom classes: `variant="outline"`, `size="sm"`, and similar APIs.
- Use semantic tokens: `bg-background`, `text-muted-foreground`, `border-border`, `text-destructive`.
- Keep layout classes in `className`, but do not override component color, typography, or behavior without a strong reason.
- Review generated or registry code after adding it. Source-code ownership means the project is responsible for quality.

## CLI workflow

```bash
npx shadcn@latest info --json
npx shadcn@latest search @shadcn -q "sidebar"
npx shadcn@latest docs button dialog select
npx shadcn@latest view @shadcn/button
npx shadcn@latest add button card dialog
npx shadcn@latest add button --dry-run
npx shadcn@latest add button --diff button.tsx
```

Never decode or fetch preset codes manually. Use the CLI:

```bash
npx shadcn@latest apply --preset a2r6bw
npx shadcn@latest init --preset a2r6bw
```

Ask before overwriting components or applying presets that may replace theme, font, or component files.

## Component composition

- Use full component families: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- Keep grouped items inside their group: `SelectItem` inside `SelectGroup`, menu items inside menu groups, command items inside command groups.
- `TabsTrigger` belongs inside `TabsList`.
- `Dialog`, `Sheet`, and `Drawer` need titles for accessibility. Use `sr-only` when visually hidden.
- `Avatar` needs `AvatarFallback`.
- Use `Alert` for callouts, `Empty` for empty states, `Separator` instead of custom borders, `Skeleton` for loading placeholders, and `Badge` for status labels.
- Use `sonner` for toast notifications when available.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project settings</CardTitle>
    <CardDescription>Manage repository and workflow defaults.</CardDescription>
  </CardHeader>
  <CardContent>{/* form fields */}</CardContent>
  <CardFooter>{/* actions */}</CardFooter>
</Card>
```

## Forms and inputs

- Use the project's shadcn form and field primitives when available.
- Labels are required. Placeholders are examples, not labels.
- Put validation state on the wrapper and the control when the component supports it.
- Use `ToggleGroup` for small option sets instead of custom active-button loops.
- Use `InputGroup` patterns for buttons or addons inside inputs.
- Preserve accessible descriptions and error messages.

```tsx
<Field data-invalid={hasError}>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" aria-invalid={hasError} />
  {hasError ? <FieldDescription>Enter a valid email.</FieldDescription> : null}
</Field>
```

## Styling rules

- Use `gap-*`, not `space-x-*` or `space-y-*`.
- Use `size-*` when width and height are equal.
- Use `truncate` instead of manually combining overflow classes.
- Use `cn()` for conditional class names.
- Avoid raw color utilities when semantic tokens or variants exist.
- Do not add manual `z-index` to overlays unless debugging a documented stacking issue.
- Do not add manual icon sizing inside components when the component styles icons.

```tsx
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>
```

## Registry risk management

- When adding third-party registry components, check imports for hardcoded aliases such as `@/components/ui`.
- Replace icon imports to match the project's configured icon library.
- Read added files before moving on. Check missing imports, accessibility titles, invalid composition, and raw styling.
- Use `--dry-run` and `--diff` before updating components with local modifications.
- Never use `--overwrite` without explicit user approval.
