import { create } from 'zustand'

/**
 * Main app store for the fitness tracker.
 * Use this store to manage global state for workouts, users, and analytics.
 *
 * Example usage:
 * const { workouts, addWorkout } = useAppStore()
 */
export const useAppStore = create((set) => ({
  // Workout state
  workouts: [],
  addWorkout: (workout) => set((state) => ({
    workouts: [...state.workouts, workout]
  })),
  removeWorkout: (id) => set((state) => ({
    workouts: state.workouts.filter(w => w.id !== id)
  })),
  updateWorkout: (id, updates) => set((state) => ({
    workouts: state.workouts.map(w => w.id === id ? { ...w, ...updates } : w)
  })),

  // Analytics state
  analyticsData: {},
  setAnalyticsData: (data) => set({ analyticsData: data }),

  // User preferences
  preferences: {
    theme: 'light',
    units: 'metric',
  },
  setPreferences: (prefs) => set((state) => ({
    preferences: { ...state.preferences, ...prefs }
  })),
}))
