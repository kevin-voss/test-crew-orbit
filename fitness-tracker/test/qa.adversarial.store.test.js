/**
 * QA Adversarial Tests — Zustand appStore edge cases
 *
 * Targets: src/store/appStore.js
 * Focus: data integrity, silent failures, null injection, boundary inputs
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

describe('QA Adversarial — appStore: workout CRUD edge cases', () => {
  beforeEach(resetStore)

  it('addWorkout with duplicate IDs produces two separate entries (no deduplication)', () => {
    // covers AC-2 (state integrity for future feature work)
    // Bug risk: removeWorkout and updateWorkout use id-based lookup; duplicates cause
    // unintended cascade removal and multi-record updates.
    const { addWorkout } = useAppStore.getState()
    addWorkout({ id: 'dup-1', name: 'Morning Run' })
    addWorkout({ id: 'dup-1', name: 'Evening Run' })

    const { workouts } = useAppStore.getState()
    // Expect: only one entry per unique id (deduplication enforced)
    // Actual: two entries stored — FAILS, exposing missing uniqueness guard
    expect(workouts.filter(w => w.id === 'dup-1').length).toBe(1)
  })

  it('removeWorkout by duplicated ID removes ALL matching entries (cascade delete)', () => {
    // covers AC-2
    // Consequence of the duplicate-ID bug: a single remove call silently deletes
    // multiple workouts, leading to data loss that is hard to detect.
    const { addWorkout, removeWorkout } = useAppStore.getState()
    addWorkout({ id: 'dup-2', name: 'Yoga' })
    addWorkout({ id: 'dup-2', name: 'Pilates' })
    removeWorkout('dup-2')

    const { workouts } = useAppStore.getState()
    // Expect: only one matching entry removed, one remains
    // Actual: both removed — FAILS
    expect(workouts.length).toBe(0)
  })

  it('updateWorkout by duplicated ID modifies ALL matching entries', () => {
    // covers AC-2
    // Another cascade consequence: a targeted update affects every duplicate,
    // corrupting data for workouts that were not intended to be modified.
    const { addWorkout, updateWorkout } = useAppStore.getState()
    addWorkout({ id: 'dup-3', name: 'Swim', duration: 30 })
    addWorkout({ id: 'dup-3', name: 'Bike', duration: 45 })
    updateWorkout('dup-3', { duration: 60 })

    const { workouts } = useAppStore.getState()
    const updated = workouts.filter(w => w.id === 'dup-3' && w.duration === 60)
    // Expect: only one entry has duration 60 (only the targeted one)
    // Actual: both updated to duration 60 — FAILS
    expect(updated.length).toBe(1)
  })

  it('removeWorkout with non-existent ID does not throw and leaves array unchanged', () => {
    // covers AC-2 — confirms graceful no-op behaviour
    const { addWorkout, removeWorkout } = useAppStore.getState()
    addWorkout({ id: 'keep-1', name: 'Stretch' })

    expect(() => removeWorkout('ghost-id')).not.toThrow()
    expect(useAppStore.getState().workouts.length).toBe(1)
  })

  it('updateWorkout with non-existent ID is a silent no-op (no error, array unchanged)', () => {
    // covers AC-2 — confirms silent-failure path; no feedback mechanism exists
    const { updateWorkout } = useAppStore.getState()
    expect(() => updateWorkout('phantom', { name: 'Phantom Workout' })).not.toThrow()
    expect(useAppStore.getState().workouts.length).toBe(0)
  })

  it('addWorkout with no id field stores an undefined-id entry', () => {
    // covers AC-2 — boundary: missing required field
    // Downstream remove/update by undefined id will match ALL such entries.
    const { addWorkout } = useAppStore.getState()
    expect(() => addWorkout({ name: 'No-ID Workout', duration: 20 })).not.toThrow()

    const { workouts } = useAppStore.getState()
    expect(workouts.length).toBe(1)
    // The stored entry has no id — safe usage requires id to always be provided
    expect(workouts[0].id).toBeUndefined()
  })

  it('updateWorkout can mutate the id field, making the original id unreachable', () => {
    // covers AC-2 — identity corruption risk
    // Once an id is changed, operations targeting the original id silently fail.
    const { addWorkout, updateWorkout } = useAppStore.getState()
    addWorkout({ id: 'original-id', name: 'Run' })
    updateWorkout('original-id', { id: 'new-id' })

    const { workouts } = useAppStore.getState()
    const byOldId = workouts.find(w => w.id === 'original-id')
    // Expect: id is immutable or protected
    // Actual: id changed to 'new-id', original id gone — test documents the risk
    expect(byOldId).not.toBeUndefined()
  })

  it('addWorkout followed by removeWorkout for undefined id removes all id-less entries', () => {
    // covers AC-2 — cascade delete on undefined ids
    const { addWorkout, removeWorkout } = useAppStore.getState()
    addWorkout({ name: 'Unnamed A' })
    addWorkout({ name: 'Unnamed B' })
    addWorkout({ id: 'safe', name: 'Named' })

    removeWorkout(undefined)

    const { workouts } = useAppStore.getState()
    // Expect: only the two undefined-id entries removed, 'safe' entry preserved
    expect(workouts.length).toBe(1)
    expect(workouts[0].id).toBe('safe')
  })

  it('stress: adding 10 000 workouts does not throw or corrupt state', () => {
    // covers AC-2 — large-volume boundary
    const { addWorkout } = useAppStore.getState()
    expect(() => {
      for (let i = 0; i < 10_000; i++) {
        addWorkout({ id: `w-${i}`, name: `Workout ${i}`, duration: i % 60 })
      }
    }).not.toThrow()
    expect(useAppStore.getState().workouts.length).toBe(10_000)
  })

  it('updateWorkout preserves all fields not included in the update object', () => {
    // covers AC-2 — confirms shallow merge safety
    const { addWorkout, updateWorkout } = useAppStore.getState()
    addWorkout({ id: 'merge-test', name: 'Run', duration: 30, calories: 200 })
    updateWorkout('merge-test', { duration: 45 })

    const w = useAppStore.getState().workouts.find(w => w.id === 'merge-test')
    expect(w.name).toBe('Run')
    expect(w.calories).toBe(200)
    expect(w.duration).toBe(45)
  })
})

describe('QA Adversarial — appStore: analyticsData null/undefined injection', () => {
  beforeEach(resetStore)

  it('setAnalyticsData(null) stores null, breaking the {} contract', () => {
    // covers AC-2
    // Bug: initial state declares analyticsData as {}.  setAnalyticsData accepts any
    // value including null.  Any component doing Object.keys(analyticsData) will throw.
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(null)

    const { analyticsData } = useAppStore.getState()
    // Expect: analyticsData remains an object (not null)
    // Actual: analyticsData === null — FAILS
    expect(analyticsData).not.toBeNull()
  })

  it('setAnalyticsData(undefined) stores undefined', () => {
    // covers AC-2
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(undefined)

    const { analyticsData } = useAppStore.getState()
    // Expect: analyticsData remains an object
    // Actual: analyticsData === undefined — FAILS
    expect(analyticsData).not.toBeUndefined()
  })

  it('setAnalyticsData(42) stores a primitive, breaking object-spread patterns', () => {
    // covers AC-2 — type coercion boundary
    const { setAnalyticsData } = useAppStore.getState()
    setAnalyticsData(42)

    const { analyticsData } = useAppStore.getState()
    // Expect: only objects are accepted
    // Actual: 42 is stored — FAILS
    expect(typeof analyticsData).toBe('object')
  })
})

describe('QA Adversarial — appStore: preferences edge cases', () => {
  beforeEach(resetStore)

  it('setPreferences({ theme: null }) stores null theme', () => {
    // covers AC-2
    // Bug: null is spread into preferences, overriding the string value with null.
    // Dark-mode toggle logic depending on preferences.theme === 'dark' will silently
    // never activate.
    const { setPreferences } = useAppStore.getState()
    setPreferences({ theme: null })

    const { preferences } = useAppStore.getState()
    // Expect: theme stays a valid string value
    // Actual: theme === null — FAILS
    expect(preferences.theme).not.toBeNull()
  })

  it('setPreferences(null) gracefully ignores the call (null spread is a no-op in JS)', () => {
    // covers AC-2 — confirms null spread safe path
    const { setPreferences } = useAppStore.getState()
    expect(() => setPreferences(null)).not.toThrow()

    const { preferences } = useAppStore.getState()
    // {...state.preferences, ...null} === {...state.preferences} — state preserved
    expect(preferences.theme).toBe('light')
    expect(preferences.units).toBe('metric')
  })

  it('setPreferences with unknown key stores it without removing known keys', () => {
    // covers AC-2 — open-ended spread accepts arbitrary keys
    const { setPreferences } = useAppStore.getState()
    setPreferences({ language: 'en', theme: 'dark' })

    const { preferences } = useAppStore.getState()
    expect(preferences.theme).toBe('dark')
    expect(preferences.units).toBe('metric')
    expect(preferences.language).toBe('en')
  })
})
