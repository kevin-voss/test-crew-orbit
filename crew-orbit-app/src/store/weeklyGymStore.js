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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
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
  const weekEnd_ms = weekStart_ms + 7 * 24 * 60 * 60 * 1000
  return sessionDate_ms >= weekStart_ms && sessionDate_ms < weekEnd_ms
}

export const useWeeklyGymStore = create((set, get) => ({
  // State — seeded with sample sessions for demo purposes
  sessions: [
    { id: 'seed-1', date: '2026-05-11', plan: 'Push Day', duration: 65 },
    { id: 'seed-2', date: '2026-05-12', plan: 'Pull Day', duration: 70 },
    { id: 'seed-3', date: '2026-05-14', plan: 'Leg Day', duration: 55 },
    { id: 'seed-4', date: '2026-05-06', plan: 'Upper Body', duration: 80 },
    { id: 'seed-5', date: '2026-05-08', plan: 'Push Day', duration: 60 },
  ],
  selectedWeekStart: getWeekStartDate(new Date()),

  // Actions
  addSession: (session) =>
    set((state) => {
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

  // Analytics selectors (derived)
  analyticsChartData: () => {
    const sessions = get().selectedWeekSessions()
    const weekStart = new Date(get().selectedWeekStart)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return dayNames.map((day, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const visits = sessions.filter((s) => s.date === dateStr).length
      return { day, visits, date: dateStr }
    })
  },

  planUsageChartData: () => {
    const sessions = get().selectedWeekSessions()
    const planCounts = {}
    sessions.forEach((s) => {
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1
    })
    return Object.entries(planCounts).map(([name, value]) => ({ name, value }))
  },

  analyticsMetrics: () => {
    const sessions = get().selectedWeekSessions()
    const plans = get().weeklyPlanUsage()
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    return {
      totalSessions: sessions.length,
      uniquePlans: plans.length,
      totalDuration,
      averageSessionDuration:
        sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
    }
  },
}))
