---
name: design-system
displayName: Design system
description: Product UI design guidance for layout, typography, color, motion, forms, navigation, empty states, and visual polish.
allowed-tools:
  - Read
  - Grep
metadata:
  creworbit:
    skillSlug: design-system
    category: frontend
    contentHash: 0077de281f851e3c94db5de93ba4a488d45f4c579522346aa0786f664eaabbff
    bodyVersionId: Hu4BPA7_FGxvtxsHyiBXFqoRxcjMIWhK
---


# Design system

Use this skill when designing, reviewing, or implementing UI. The goal is a clean interface that feels intentional, accessible, and consistent without unnecessary visual complexity.

## Core principles

- Start with hierarchy: what should the user notice first, second, and third?
- Prefer clarity over decoration. Every visual detail should support comprehension, affordance, or brand.
- Use existing design tokens, components, and layout patterns before inventing new ones.
- Keep spacing, typography, color, and motion consistent across the product.
- Design all states: default, hover, focus, active, disabled, loading, empty, error, success, and permission denied.
- Make responsive behavior explicit. Do not let layouts collapse accidentally.

## Layout and spacing

- Use a predictable spacing scale. Avoid one-off pixel values unless matching a precise asset or known exception.
- Align elements to a clear grid and shared edges.
- Group related controls with proximity; separate unrelated sections with whitespace, cards, dividers, or headings.
- Keep line lengths readable. Dense admin tables and marketing copy need different constraints.
- Prefer simple flows over nested panels, nested scroll areas, and deeply stacked cards.
- Avoid layout jumps when content loads, errors appear, or validation messages render.

## Typography

- Use typography to express hierarchy, not just size.
- Keep font weights consistent: usually regular for body, medium/semibold for headings and labels.
- Avoid too many font sizes on one screen.
- Use readable line-height for paragraphs and tighter line-height for headings.
- Make labels and helper text concise. Place detailed guidance where it does not interrupt completion.

## Color and themes

- Use semantic tokens such as background, foreground, muted, primary, destructive, border, and ring.
- Do not hardcode raw colors when a token exists.
- Check contrast in light and dark themes.
- Use color plus text or iconography for status. Do not rely on color alone.
- Reserve high-emphasis colors for primary actions, destructive actions, and important state.
- Keep brand gradients, glows, and decorative backgrounds subtle enough to preserve readability.

## Motion and effects

- Use motion to explain state changes, not to show off.
- Keep transitions short and calm for common UI interactions.
- Respect reduced-motion preferences.
- Avoid chained animations that delay task completion.
- Use hover and focus effects to communicate interactivity, especially for cards, table rows, buttons, and links.

## Forms

- Every field needs a clear label. Placeholders are examples, not labels.
- Use helper text for constraints before the user makes a mistake.
- Show validation near the field that needs attention.
- Preserve user input after validation errors.
- Disable submit only when the reason is obvious, or show the reason nearby.
- For destructive or irreversible actions, require confirmation proportional to the risk.

## Navigation and information architecture

- Keep navigation labels short and stable.
- Highlight the current location.
- Use breadcrumbs when hierarchy matters.
- Avoid hiding primary navigation behind ambiguous icons.
- For tabs, keep tab content related and preserve tab state when useful.
- Empty states should explain what is missing and offer the next useful action.

## Images, icons, and backgrounds

- Icons should clarify meaning, not replace important text.
- Use a consistent icon family, stroke width, and size.
- Optimize images and provide useful alt text when images carry meaning.
- Decorative images should not distract from the primary task.
- Background details should preserve contrast and should not create noisy text areas.

## Skeletons, loading, and scroll

- Use skeletons that resemble final layout when loading takes noticeable time.
- Prefer inline progress for local actions and page-level loading for full-page transitions.
- Keep scroll behavior predictable. Avoid nested scroll containers unless they solve a real layout problem.
- Preserve scroll position when returning to lists when the product flow benefits from it.
- Use sticky headers or action bars only when they reduce user effort.

## Risk management

- Check keyboard navigation and focus states before shipping interactive UI.
- Review responsive states for small, medium, and wide screens.
- Test error, empty, and long-content cases, not only ideal mock data.
- Avoid introducing a new visual pattern if an existing pattern can solve the same problem.
- Treat inconsistent spacing, unclear hierarchy, and low contrast as product quality bugs.
