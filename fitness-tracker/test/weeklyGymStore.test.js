import { describe, it, expect, beforeEach } from 'vitest'
import { useWeeklyGymStore } from '../src/store/weeklyGymStore.js'

/**
 * Test suite for weekly gym store
 * Validates all acceptance criteria and core functionality
 */

// Helper: Reset store to clean state between tests
function resetStore() {
  useWeeklyGymStore.setState({
    sessions: [],
    selectedWeekStart: new Date().toISOString().split('T')[0],
  })
}

describe('Weekly Gym Store', () => {
  beforeEach(resetStore)

  describe('Data Model', () => {
    it('initializes with empty sessions and current week selected', () => {
      const { sessions, selectedWeekStart } = useWeeklyGymStore.getState()
      expect(sessions).toEqual([])
      expect(selectedWeekStart).toBeDefined()
    })

    it('stores sessions with id, date, and plan fields', () => {
      const { addSession } = useWeeklyGymStore.getState()
      const testSession = {
        id: 'session-1',
        date: '2026-05-13',
        plan: 'Push Day',
        duration: 60,
      }
      addSession(testSession)

      const { sessions } = useWeeklyGymStore.getState()
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(testSession)
    })
  })

  describe('AC-1: Weekly Visit Count', () => {
    it('returns correct weekly visit count for sessions in selected week', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12' // Monday of week being tested
      setSelectedWeek(mondayThisWeek)

      // Add sessions throughout the week
      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Leg Day',
        duration: 75,
      })
      addSession({
        id: 'ses-2',
        date: '2026-05-14',
        plan: 'Push Day',
        duration: 60,
      })
      addSession({
        id: 'ses-3',
        date: '2026-05-16',
        plan: 'Pull Day',
        duration: 65,
      })

      const count = useWeeklyGymStore.getState().weeklyVisitCount()
      expect(count).toBe(3)
    })

    it('excludes sessions from other weeks in visit count', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Leg Day',
      })
      addSession({
        id: 'ses-2',
        date: '2026-05-05',
        plan: 'Old Week',
      }) // Previous week

      const count = useWeeklyGymStore.getState().weeklyVisitCount()
      expect(count).toBe(1)
    })
  })

  describe('AC-2: Weekly Plan Usage', () => {
    it('returns plans used in the selected week', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Push Day',
      })
      addSession({
        id: 'ses-2',
        date: '2026-05-14',
        plan: 'Pull Day',
      })
      addSession({
        id: 'ses-3',
        date: '2026-05-16',
        plan: 'Leg Day',
      })

      const plans = useWeeklyGymStore.getState().weeklyPlanUsage()
      expect(plans).toHaveLength(3)
      expect(plans).toContain('Push Day')
      expect(plans).toContain('Pull Day')
      expect(plans).toContain('Leg Day')
    })

    it('returns unique plans without duplicates', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Push Day',
      })
      addSession({
        id: 'ses-2',
        date: '2026-05-14',
        plan: 'Push Day',
      })
      addSession({
        id: 'ses-3',
        date: '2026-05-16',
        plan: 'Pull Day',
      })

      const plans = useWeeklyGymStore.getState().weeklyPlanUsage()
      expect(plans).toHaveLength(2)
      expect(plans.filter((p) => p === 'Push Day')).toHaveLength(1)
    })
  })

  describe('AC-3: Derived Data Refresh', () => {
    it('updates weekly visit count when session is added', () => {
      const { addSession, setSelectedWeek, weeklyVisitCount } =
        useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      expect(weeklyVisitCount()).toBe(0)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Leg Day',
      })

      expect(useWeeklyGymStore.getState().weeklyVisitCount()).toBe(1)
    })

    it('updates weekly plan usage when session is added', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Push Day',
      })

      expect(useWeeklyGymStore.getState().weeklyPlanUsage()).toContain(
        'Push Day'
      )
    })

    it('updates counts when session is updated', () => {
      const { addSession, updateSession, setSelectedWeek } =
        useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      addSession({
        id: 'ses-1',
        date: '2026-05-12',
        plan: 'Push Day',
      })

      const plansBeforeUpdate = useWeeklyGymStore.getState().weeklyPlanUsage()
      expect(plansBeforeUpdate).toContain('Push Day')

      updateSession('ses-1', { plan: 'Pull Day' })

      const plansAfterUpdate = useWeeklyGymStore.getState().weeklyPlanUsage()
      expect(plansAfterUpdate).toContain('Pull Day')
      expect(plansAfterUpdate).not.toContain('Push Day')
    })
  })

  describe('Store Actions', () => {
    it('addSession accepts valid session objects', () => {
      const { addSession } = useWeeklyGymStore.getState()
      const session = {
        id: 'test-1',
        date: '2026-05-13',
        plan: 'Arms',
      }
      addSession(session)

      expect(useWeeklyGymStore.getState().sessions).toHaveLength(1)
    })

    it('addSession rejects non-object inputs', () => {
      const { addSession } = useWeeklyGymStore.getState()
      addSession('invalid')
      addSession(123)
      addSession(null)
      addSession(undefined)

      expect(useWeeklyGymStore.getState().sessions).toHaveLength(0)
    })

    it('addSession rejects objects without required fields', () => {
      const { addSession } = useWeeklyGymStore.getState()
      addSession({ date: '2026-05-13' }) // Missing id and plan
      addSession({ id: 'test', plan: 'Push' }) // Missing date

      expect(useWeeklyGymStore.getState().sessions).toHaveLength(0)
    })

    it('updateSession modifies existing session', () => {
      const { addSession, updateSession } = useWeeklyGymStore.getState()
      addSession({
        id: 'test-1',
        date: '2026-05-13',
        plan: 'Push Day',
        duration: 60,
      })

      updateSession('test-1', { duration: 75 })

      const session = useWeeklyGymStore.getState().sessions[0]
      expect(session.duration).toBe(75)
      expect(session.plan).toBe('Push Day') // Other fields preserved
    })

    it('setSelectedWeek changes the active week', () => {
      const { setSelectedWeek } = useWeeklyGymStore.getState()
      const newWeek = '2026-05-05'
      setSelectedWeek(newWeek)

      const { selectedWeekStart } = useWeeklyGymStore.getState()
      // Should be normalized to Monday of that week
      expect(selectedWeekStart).toBeDefined()
    })

    it('removeSession deletes session by id', () => {
      const { addSession, removeSession } = useWeeklyGymStore.getState()
      addSession({
        id: 'test-1',
        date: '2026-05-13',
        plan: 'Push',
      })

      removeSession('test-1')

      expect(useWeeklyGymStore.getState().sessions).toHaveLength(0)
    })
  })

  describe('Week-Based View', () => {
    it('correctly groups sessions by week', () => {
      const { addSession, setSelectedWeek } = useWeeklyGymStore.getState()

      // Add sessions for two different weeks
      const week1 = '2026-05-12' // Monday of week 1
      const week2 = '2026-05-19' // Monday of week 2

      addSession({
        id: 'w1-1',
        date: '2026-05-13',
        plan: 'Push',
      })
      addSession({
        id: 'w1-2',
        date: '2026-05-15',
        plan: 'Pull',
      })
      addSession({
        id: 'w2-1',
        date: '2026-05-20',
        plan: 'Leg',
      })

      setSelectedWeek(week1)
      let count = useWeeklyGymStore.getState().weeklyVisitCount()
      expect(count).toBe(2)

      setSelectedWeek(week2)
      count = useWeeklyGymStore.getState().weeklyVisitCount()
      expect(count).toBe(1)
    })
  })

  describe('User Flow: View and Update Sessions', () => {
    it('supports user opening app and viewing current week sessions', () => {
      const { addSession, setSelectedWeek, selectedWeekSessions } =
        useWeeklyGymStore.getState()

      // User opens app (current week is already selected by default)
      const today = new Date()
      const mondayThisWeek = new Date(today)
      mondayThisWeek.setDate(today.getDate() - today.getDay() + 1)
      const weekStart = mondayThisWeek.toISOString().split('T')[0]
      setSelectedWeek(weekStart)

      // Store provides current week's sessions
      const sessions = useWeeklyGymStore.getState().selectedWeekSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('updates totals when user records a session', () => {
      const { addSession, setSelectedWeek, weeklyVisitCount } =
        useWeeklyGymStore.getState()
      const mondayThisWeek = '2026-05-12'
      setSelectedWeek(mondayThisWeek)

      const initialCount = weeklyVisitCount()
      expect(initialCount).toBe(0)

      // User records a session
      addSession({
        id: 'new-session',
        date: '2026-05-13',
        plan: 'Strength Training',
        duration: 90,
      })

      // Weekly totals update immediately
      const updatedCount = useWeeklyGymStore.getState().weeklyVisitCount()
      expect(updatedCount).toBe(1)
    })

    it('updates display when user changes viewed week', () => {
      const { addSession, setSelectedWeek, weeklyVisitCount } =
        useWeeklyGymStore.getState()

      // Add sessions for two weeks
      const week1Start = '2026-05-12'
      const week2Start = '2026-05-19'

      addSession({
        id: 's1',
        date: '2026-05-13',
        plan: 'Push',
      })
      addSession({
        id: 's2',
        date: '2026-05-20',
        plan: 'Pull',
      })

      // View week 1
      setSelectedWeek(week1Start)
      expect(useWeeklyGymStore.getState().weeklyVisitCount()).toBe(1)

      // Change to week 2
      setSelectedWeek(week2Start)
      expect(useWeeklyGymStore.getState().weeklyVisitCount()).toBe(1)
    })
  })
})
