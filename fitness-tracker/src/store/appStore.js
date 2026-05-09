import { create } from 'zustand'

/**
 * Main app store for the fitness tracker.
 * Use this store to manage global state for workouts, users, and analytics.
 *
 * Example usage:
 * const { workouts, addWorkout } = useAppStore()
 */
function uniqueSuffix() {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export const useAppStore = create((set) => ({
  // Workout state
  workouts: [],
  addWorkout: (workout) => set((state) => {
    const id = workout.id
    const idTaken = id !== undefined && state.workouts.some((w) => w.id === id)
    const next = idTaken ? { ...workout, id: `${String(id)}:${uniqueSuffix()}` } : workout
    return { workouts: [...state.workouts, next] }
  }),
  removeWorkout: (id) => set((state) => ({
    workouts: state.workouts.filter((w) => w.id !== id),
  })),
  updateWorkout: (id, updates) => set((state) => {
    // Protect id field from mutation: strip it from updates
    const { id: _, ...safeUpdates } = updates
    return {
      workouts: state.workouts.map(w => w.id === id ? { ...w, ...safeUpdates } : w)
    }
  }),

  // Analytics state
  analyticsData: {},
  setAnalyticsData: (data) => set((state) => {
    // Validate that data is a non-null object
    if (typeof data !== 'object' || data === null) {
      return { analyticsData: {} }
    }
    return { analyticsData: data }
  }),

  // User preferences
  preferences: {
    theme: 'light',
    units: 'metric',
  },
  setPreferences: (prefs) => set((state) => {
    // Filter out null/undefined values to prevent corrupting preference state
    const filtered = {}
    for (const [key, value] of Object.entries(prefs || {})) {
      if (value !== null && value !== undefined) {
        filtered[key] = value
      }
    }
    return {
      preferences: { ...state.preferences, ...filtered }
    }
  }),
}))
