/**
 * QA Adversarial Tests — src/lib/utils.js (cn helper)
 *
 * The cn() function is used in every UI component.  Any edge case that causes
 * it to throw or produce an incorrect class string would break the entire UI.
 *
 * Focus: null/undefined tolerance, Tailwind conflict resolution, type diversity.
 */
import { describe, it, expect } from 'vitest'
import { cn } from '../src/lib/utils.js'

describe('QA Adversarial — cn() utility: null / undefined tolerance', () => {
  it('cn() with no arguments returns an empty string without throwing', () => {
    // covers AC-2 — defensive: called with no args during conditional rendering
    expect(() => cn()).not.toThrow()
    expect(cn()).toBe('')
  })

  it('cn(null) does not throw and returns empty string', () => {
    // covers AC-2
    expect(() => cn(null)).not.toThrow()
    expect(cn(null)).toBe('')
  })

  it('cn(undefined) does not throw and returns empty string', () => {
    // covers AC-2
    expect(() => cn(undefined)).not.toThrow()
    expect(cn(undefined)).toBe('')
  })

  it('cn(null, null, null) does not throw', () => {
    // covers AC-2 — multiple nulls at once
    expect(() => cn(null, null, null)).not.toThrow()
    expect(cn(null, null, null)).toBe('')
  })

  it('cn(undefined, null, undefined) returns empty string', () => {
    // covers AC-2
    expect(cn(undefined, null, undefined)).toBe('')
  })

  it('cn(false) does not throw', () => {
    // covers AC-2 — short-circuit expressions like cn(condition && "class") produce false
    expect(() => cn(false)).not.toThrow()
    expect(cn(false)).toBe('')
  })

  it('cn(0) does not throw', () => {
    // covers AC-2 — numeric falsy value from accidental coercion
    expect(() => cn(0)).not.toThrow()
  })
})

describe('QA Adversarial — cn() utility: Tailwind conflict resolution', () => {
  it('last padding class wins when conflicting px- classes are merged', () => {
    // covers AC-2 — twMerge must resolve conflicts; without it shadcn components
    // would accumulate duplicate padding and render incorrectly
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('last text-color class wins when conflicting text- classes are merged', () => {
    // covers AC-2
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('background color conflict: last bg- class wins', () => {
    // covers AC-2
    const result = cn('bg-white', 'bg-gray-100')
    expect(result).toBe('bg-gray-100')
  })

  it('non-conflicting classes are all preserved', () => {
    // covers AC-2
    const result = cn('flex', 'items-center', 'justify-between')
    expect(result).toContain('flex')
    expect(result).toContain('items-center')
    expect(result).toContain('justify-between')
  })

  it('conditional class object: truthy keys are included', () => {
    // covers AC-2 — clsx object syntax used in button/sidebar components
    const result = cn({ 'bg-primary': true, 'bg-secondary': false })
    expect(result).toContain('bg-primary')
    expect(result).not.toContain('bg-secondary')
  })

  it('conditional class object: falsy keys are excluded', () => {
    // covers AC-2
    const result = cn({ hidden: false, block: true })
    expect(result).not.toContain('hidden')
    expect(result).toContain('block')
  })
})

describe('QA Adversarial — cn() utility: mixed input types', () => {
  it('cn() with mixed null, string, and object inputs returns correct classes', () => {
    // covers AC-2 — realistic usage in components with conditional styling
    const result = cn(null, 'flex', undefined, { 'font-bold': true }, null)
    expect(result).toContain('flex')
    expect(result).toContain('font-bold')
  })

  it('cn() with array inputs does not throw', () => {
    // covers AC-2 — clsx supports nested arrays
    expect(() => cn(['flex', 'items-center'])).not.toThrow()
    const result = cn(['flex', 'items-center'])
    expect(result).toContain('flex')
  })

  it('cn() with deeply nested empty arrays does not throw', () => {
    // covers AC-2 — edge: empty nesting
    expect(() => cn([[], []])).not.toThrow()
  })

  it('cn() with an empty string input returns an empty string', () => {
    // covers AC-2
    expect(cn('')).toBe('')
  })

  it('cn() result is always a string, never undefined or null', () => {
    // covers AC-2 — component classNames must always be strings
    const cases = [
      cn(),
      cn(null),
      cn(undefined),
      cn(false),
      cn(''),
      cn(null, undefined, false),
    ]
    for (const result of cases) {
      expect(typeof result).toBe('string')
    }
  })

  it('cn() preserves whitespace-trimmed class strings (no leading/trailing spaces)', () => {
    // covers AC-2 — extra whitespace can break strict className comparisons in tests
    const result = cn('flex', 'items-center')
    expect(result).not.toMatch(/^\s/)
    expect(result).not.toMatch(/\s$/)
  })
})
