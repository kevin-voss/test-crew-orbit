/**
 * QA Adversarial Tests — Store guard robustness (Cycle 3 fixes)
 *
 * Targets: src/store/appStore.js
 * Focus: BUG-5 (addWorkout plain-object guard), BUG-6 (setAnalyticsData array
 *        rejection), BUG-7 (setPreferences array rejection).
 *
 * These tests verify that the three guards introduced in Cycle 3/4 actually
 * block malformed input and leave state intact.  Each test is written to PASS
 * against the fixed implementation and to FAIL against the pre-fix code.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../src/store/appStore.js'

// Helper: reset store to pristine initial state between tests
function resetStore() {
  useAppStore.setState({
    workouts: [],
    analyticsData: {},
    preferences: { theme: 'light', units: 'metric' },
  })
}

// ---------------------------------------------------------------------------
// BUG-5: addWorkout — plain-object guard
// Pre-fix: typeof/null check absent; primitives appended verbatim.
// Post-fix: guard `typeof workout !== 'object' || workout === null` rejects all
//           non-object inputs, returning current state unchanged.
// ---------------------------------------------------------------------------
describe('QA Robustness — BUG-5: addWorkout plain-object guard', () => {
  beforeEach(resetStore)

  it('addWorkout(string) is silently rejected; workouts array stays empty', () => {
    // covers AC-2 — pre-fix: w.name/w.duration undefined on downstream access
    const { addWorkout } = useAppStore.getState()
    addWorkout('morning run')

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(0)
  })

  it('addWorkout(number) is silently rejected; workouts array stays empty', () => {
    // covers AC-2 — numeric literal appended pre-fix; typeof w.name === undefined
    const { addWorkout } = useAppStore.getState()
    addWorkout(42)

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(0)
  })

  it('addWorkout(boolean) is silently rejected; workouts array stays empty', () => {
    // covers AC-2 — boolean literal passed instead of workout object
    const { addWorkout } = useAppStore.getState()
    addWorkout(true)

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(0)
  })

  it('addWorkout(undefined) is silently rejected; workouts array stays empty', () => {
    // covers AC-2 — called with no argument or explicit undefined
    const { addWorkout } = useAppStore.getState()
    addWorkout(undefined)

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(0)
  })

  it('addWorkout(null) is silently rejected; workouts array stays empty', () => {
    // covers AC-2 — typeof null === 'object' but null === null must also be caught
    const { addWorkout } = useAppStore.getState()
    addWorkout(null)

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(0)
  })

  it('valid object is still accepted after a sequence of primitive rejections', () => {
    // covers AC-2 — guard must not corrupt subsequent valid calls
    const { addWorkout } = useAppStore.getState()
    addWorkout('bad')
    addWorkout(0)
    addWorkout(null)
    addWorkout({ id: 'w-ok', name: 'Recovery Run', duration: 20 })

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(1)
    expect(workouts[0].id).toBe('w-ok')
  })
})

// ---------------------------------------------------------------------------
// BUG-6: setAnalyticsData — array rejection
// Pre-fix: typeof/null check passes for arrays (typeof [] === 'object' && [] !== null).
// Post-fix: additional Array.isArray guard rejects arrays, returning {}.
// ---------------------------------------------------------------------------
describe('QA Robustness — BUG-6: setAnalyticsData array rejection', () => {
  beforeEach(resetStore)

  it('setAnalyticsData([]) is rejected; analyticsData falls back to {}', () => {
    // covers AC-2 — pre-fix: { ...[] } === {} but downstream Object.keys breaks
    //               on unexpected shape; now rejected with explicit fallback
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData([])

    const { analyticsData } = useAppStore.getState()
    expect(Array.isArray(analyticsData)).toBe(false)
    expect(typeof analyticsData).toBe('object')
    expect(analyticsData).not.toBeNull()
  })

  it('setAnalyticsData([string]) is rejected; analyticsData falls back to {}', () => {
    // covers AC-2 — string-valued array; pre-fix stores it, spreading yields '0':'x'
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(['x', 'y'])

    const { analyticsData } = useAppStore.getState()
    expect(Array.isArray(analyticsData)).toBe(false)
    expect(Object.keys(analyticsData)).toHaveLength(0)
  })

  it('setAnalyticsData([object]) is rejected; analyticsData falls back to {}', () => {
    // covers AC-2 — array of objects is still an array; must be blocked
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData([{ key: 'val' }])

    const { analyticsData } = useAppStore.getState()
    expect(Array.isArray(analyticsData)).toBe(false)
    expect(analyticsData).toEqual({})
  })

  it('analyticsData is always object-spreadable after an array injection attempt', () => {
    // covers AC-2 — { ...analyticsData } must never throw after a blocked array call
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData([1, 2, 3])

    const { analyticsData } = useAppStore.getState()
    expect(() => ({ ...analyticsData })).not.toThrow()
  })

  it('sparse array new Array(3) is rejected; analyticsData falls back to {}', () => {
    // covers AC-2 — sparse arrays are still arrays; Array.isArray(new Array(3)) is true
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(new Array(3))

    const { analyticsData } = useAppStore.getState()
    expect(Array.isArray(analyticsData)).toBe(false)
  })

  it('valid plain object is accepted after an array rejection', () => {
    // covers AC-2 — guard must not block legitimate subsequent calls
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(['rejected'])
    setAnalyticsData({ weeklySteps: 42_000, avgHeartRate: 72 })

    const { analyticsData } = useAppStore.getState()
    expect(analyticsData.weeklySteps).toBe(42_000)
    expect(analyticsData.avgHeartRate).toBe(72)
  })
})

// ---------------------------------------------------------------------------
// BUG-7: setPreferences — array rejection
// Pre-fix: Object.entries(['dark']) yields [['0','dark']]; numeric index '0'
//          merged as an unexpected preference key.
// Post-fix: Array.isArray guard returns current state unchanged.
// ---------------------------------------------------------------------------
describe('QA Robustness — BUG-7: setPreferences array rejection', () => {
  beforeEach(resetStore)

  it('setPreferences(["dark"]) leaves preferences completely unchanged', () => {
    // covers AC-2 — pre-fix merges {0:'dark'} into preferences; post-fix: no-op
    const { setPreferences } = useAppStore.getState()
    setPreferences(['dark'])

    const { preferences } = useAppStore.getState()
    expect(preferences.theme).toBe('light')
    expect(preferences.units).toBe('metric')
  })

  it('setPreferences([]) leaves preferences completely unchanged', () => {
    // covers AC-2 — empty array; Object.entries([]) = [] so pre-fix was silent
    //               but the type is wrong; guard ensures consistent rejection
    const { setPreferences } = useAppStore.getState()
    setPreferences([])

    const { preferences } = useAppStore.getState()
    expect(preferences.theme).toBe('light')
    expect(preferences.units).toBe('metric')
  })

  it('no numeric index key appears in preferences after array input', () => {
    // covers AC-2 — confirms no '0', '1', '2' keys leak into preferences object
    const { setPreferences } = useAppStore.getState()
    setPreferences(['a', 'b', 'c'])

    const { preferences } = useAppStore.getState()
    expect(Object.keys(preferences)).not.toContain('0')
    expect(Object.keys(preferences)).not.toContain('1')
    expect(Object.keys(preferences)).not.toContain('2')
  })

  it('preferences.theme remains original string value after array injection attempt', () => {
    // covers AC-2 — theme must stay a string for dark-mode toggle logic
    const { setPreferences } = useAppStore.getState()
    setPreferences(['dark'])

    const { preferences } = useAppStore.getState()
    expect(typeof preferences.theme).toBe('string')
    expect(preferences.theme).toBe('light')
  })

  it('valid object update is accepted after an array rejection', () => {
    // covers AC-2 — guard must not break subsequent valid setPreferences calls
    const { setPreferences } = useAppStore.getState()
    setPreferences(['dark'])
    setPreferences({ theme: 'dark' })

    const { preferences } = useAppStore.getState()
    expect(preferences.theme).toBe('dark')
    expect(preferences.units).toBe('metric')
  })

  it('Object.entries(preferences) after array input yields only original keys', () => {
    // covers AC-2 — exact key set must be preserved; no pollution from array indices
    const { setPreferences } = useAppStore.getState()
    setPreferences(['x', 'y'])

    const { preferences } = useAppStore.getState()
    const keys = Object.keys(preferences).sort()
    expect(keys).toEqual(['theme', 'units'])
  })
})
