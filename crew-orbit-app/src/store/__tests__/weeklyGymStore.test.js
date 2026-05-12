import { describe, it, expect, beforeEach } from 'vitest'
import { useWeeklyGymStore } from '../weeklyGymStore'

function getStore() {
  return useWeeklyGymStore.getState()
}

function resetStore() {
  useWeeklyGymStore.setState({ sessions: [] })
}

describe('weeklyGymStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('provides an empty sessions array on init', () => {
      expect(getStore().sessions).toEqual([])
    })

    it('provides a selectedWeekStart as an ISO date string', () => {
      const { selectedWeekStart } = getStore()
      expect(typeof selectedWeekStart).toBe('string')
      expect(/^\d{4}-\d{2}-\d{2}$/.test(selectedWeekStart)).toBe(true)
    })
  })

  describe('addSession', () => {
    it('adds a valid session', () => {
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      expect(getStore().sessions).toHaveLength(1)
      expect(getStore().sessions[0].plan).toBe('Push Day')
    })

    it('rejects null', () => {
      getStore().addSession(null)
      expect(getStore().sessions).toHaveLength(0)
    })

    it('rejects a non-object primitive', () => {
      getStore().addSession('invalid')
      expect(getStore().sessions).toHaveLength(0)
    })

    it('rejects session missing required fields', () => {
      getStore().addSession({ id: '1', date: '2026-05-12' }) // missing plan
      expect(getStore().sessions).toHaveLength(0)
    })
  })

  describe('updateSession', () => {
    it('updates an existing session', () => {
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().updateSession('1', { plan: 'Pull Day' })
      expect(getStore().sessions[0].plan).toBe('Pull Day')
    })

    it('rejects null updates', () => {
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().updateSession('1', null)
      expect(getStore().sessions[0].plan).toBe('Push Day')
    })
  })

  describe('removeSession', () => {
    it('removes a session by id', () => {
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().removeSession('1')
      expect(getStore().sessions).toHaveLength(0)
    })
  })

  describe('setSelectedWeek', () => {
    it('sets the selected week start to the Monday of the given date', () => {
      getStore().setSelectedWeek('2026-05-14') // Thursday → Monday = 2026-05-11
      expect(getStore().selectedWeekStart).toBe('2026-05-11')
    })
  })

  describe('selectedWeekSessions selector', () => {
    it('returns only sessions in the selected week', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().addSession({ id: '2', date: '2026-05-19', plan: 'Pull Day' }) // next week
      expect(getStore().selectedWeekSessions()).toHaveLength(1)
    })
  })

  describe('weeklyVisitCount selector', () => {
    it('counts visits in the selected week', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().addSession({ id: '2', date: '2026-05-13', plan: 'Pull Day' })
      expect(getStore().weeklyVisitCount()).toBe(2)
    })
  })

  describe('weeklyPlanUsage selector', () => {
    it('returns unique plans used in the selected week', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().addSession({ id: '2', date: '2026-05-13', plan: 'Push Day' })
      getStore().addSession({ id: '3', date: '2026-05-14', plan: 'Pull Day' })
      const plans = getStore().weeklyPlanUsage()
      expect(plans).toHaveLength(2)
      expect(plans).toContain('Push Day')
      expect(plans).toContain('Pull Day')
    })
  })

  describe('analyticsChartData selector', () => {
    it('returns 7 daily entries for the selected week', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      const data = getStore().analyticsChartData()
      expect(data).toHaveLength(7)
      expect(data[0].day).toBe('Mon')
      expect(data[6].day).toBe('Sun')
    })

    it('counts visits per day', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-11', plan: 'Push Day' })
      const data = getStore().analyticsChartData()
      expect(data[0].visits).toBe(1) // Monday
    })
  })

  describe('planUsageChartData selector', () => {
    it('returns empty array when no sessions', () => {
      const data = getStore().planUsageChartData()
      expect(data).toEqual([])
    })

    it('returns plan usage counts for the selected week', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day' })
      getStore().addSession({ id: '2', date: '2026-05-13', plan: 'Push Day' })
      getStore().addSession({ id: '3', date: '2026-05-14', plan: 'Pull Day' })
      const data = getStore().planUsageChartData()
      expect(data).toHaveLength(2)
      const pushDay = data.find((d) => d.name === 'Push Day')
      const pullDay = data.find((d) => d.name === 'Pull Day')
      expect(pushDay.value).toBe(2)
      expect(pullDay.value).toBe(1)
    })
  })

  describe('analyticsMetrics selector', () => {
    it('returns zero metrics when no sessions', () => {
      const metrics = getStore().analyticsMetrics()
      expect(metrics.totalSessions).toBe(0)
      expect(metrics.uniquePlans).toBe(0)
      expect(metrics.totalDuration).toBe(0)
      expect(metrics.averageSessionDuration).toBe(0)
    })

    it('calculates metrics correctly', () => {
      useWeeklyGymStore.setState({ selectedWeekStart: '2026-05-11' })
      getStore().addSession({ id: '1', date: '2026-05-12', plan: 'Push Day', duration: 60 })
      getStore().addSession({ id: '2', date: '2026-05-13', plan: 'Pull Day', duration: 45 })
      const metrics = getStore().analyticsMetrics()
      expect(metrics.totalSessions).toBe(2)
      expect(metrics.uniquePlans).toBe(2)
      expect(metrics.totalDuration).toBe(105)
      expect(metrics.averageSessionDuration).toBe(53)
    })
  })
})
