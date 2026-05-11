import { create } from 'zustand'

/**
 * Weekly Gym Store — Zustand state for tracking gym activity by week
 *
 * Model:
 * - sessions: array of { id, date, plan, duration }
 * - selectedWeekStart: ISO string for the start of the week being viewed
 *
 * Selectors (derived):
 * - selectedWeekSessions: gym sessions for the selected week
 * - weeklyVisitCount: number of visits in the selected week
 * - weeklyPlanUsage: set of plans trained in the selected week
 */

/**
 * Helper: Get the ISO date string for Monday of a given date's week
 * @param {Date|string} date
 * @returns {string} ISO date string (YYYY-MM-DD) for the Monday of that week
 */
function getWeekStartDate(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

/**
 * Helper: Check if a session date falls within the selected week
 * @param {string} sessionDate - ISO date string (YYYY-MM-DD)
 * @param {string} weekStartDate - ISO date string (YYYY-MM-DD) for Monday
 * @returns {boolean}
 */
function isInWeek(sessionDate, weekStartDate) {
  const sessionDate_ms = new Date(sessionDate).getTime()
  const weekStart_ms = new Date(weekStartDate).getTime()
  const weekEnd_ms = weekStart_ms + 7 * 24 * 60 * 60 * 1000 // 7 days later
  return sessionDate_ms >= weekStart_ms && sessionDate_ms < weekEnd_ms
}

export const useWeeklyGymStore = create((set, get) => ({
  // State
  sessions: [],
  selectedWeekStart: getWeekStartDate(new Date()),

  // Actions
  addSession: (session) =>
    set((state) => {
      // Validate: session must be a plain object with required fields
      if (typeof session !== 'object' || session === null) {
        return state
      }
      if (!session.id || !session.date || !session.plan) {
        return state
      }
      return {
        sessions: [...state.sessions, session],
      }
    }),

  updateSession: (id, updates) =>
    set((state) => {
      // Validate: updates must be an object
      if (typeof updates !== 'object' || updates === null) {
        return state
      }
      return {
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }
    }),

  setSelectedWeek: (dateInWeek) =>
    set(() => ({
      selectedWeekStart: getWeekStartDate(dateInWeek),
    })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),

  // Selectors (derived)
  selectedWeekSessions: () => {
    const state = get()
    return state.sessions.filter((s) =>
      isInWeek(s.date, state.selectedWeekStart)
    )
  },

  weeklyVisitCount: () => {
    return get().selectedWeekSessions().length
  },

  weeklyPlanUsage: () => {
    const sessions = get().selectedWeekSessions()
    const plansSet = new Set(sessions.map((s) => s.plan))
    return Array.from(plansSet)
  },
}))
