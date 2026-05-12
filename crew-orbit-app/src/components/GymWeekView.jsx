import { useWeeklyGymStore } from '@/store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import SessionList from '@/components/SessionList'

export default function GymWeekView() {
  const weeklyVisitCount = useWeeklyGymStore(state => state.weeklyVisitCount())
  const weeklyPlanUsage = useWeeklyGymStore(state => state.weeklyPlanUsage())
  const selectedWeekStart = useWeeklyGymStore(state => state.selectedWeekStart)
  const selectedWeekSessions = useWeeklyGymStore(state => state.selectedWeekSessions())
  const analyticsChartData = useWeeklyGymStore(state => state.analyticsChartData())
  const setSelectedWeek = useWeeklyGymStore(state => state.setSelectedWeek)

  // Parse as local time to avoid UTC midnight → previous-day shift
  const weekStart = new Date(selectedWeekStart + 'T00:00:00')
  const weekEnd = new Date(selectedWeekStart + 'T00:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const goToPrevWeek = () => {
    const prev = new Date(selectedWeekStart + 'T00:00:00')
    prev.setDate(prev.getDate() - 7)
    setSelectedWeek(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(selectedWeekStart + 'T00:00:00')
    next.setDate(next.getDate() + 7)
    setSelectedWeek(next)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Week Header with navigation */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weekly Gym Activity</h1>
          <p className="text-muted-foreground mt-1">
            {formatDate(weekStart)} — {formatDate(weekEnd)}
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>← Prev</Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>Next →</Button>
        </div>
      </div>

      {/* 7-Day Activity Grid */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-7 gap-1 text-center">
            {analyticsChartData.map(({ day, visits, date }) => {
              const dayDate = new Date(date + 'T00:00:00')
              const hasSession = visits > 0
              return (
                <div key={day} className="flex flex-col items-center gap-1 py-1">
                  <span className="text-xs font-medium text-muted-foreground">{day}</span>
                  <span className="text-xs text-muted-foreground">{dayDate.getDate()}</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                      hasSession
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {hasSession ? visits : '–'}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visit Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">
                {weeklyVisitCount}
              </div>
              <span className="text-muted-foreground">
                session{weeklyVisitCount !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Training Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyPlanUsage.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weeklyPlanUsage.map((plan, idx) => (
                  <Badge key={idx} variant="secondary">
                    {plan}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No plans recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session List */}
      <SessionList sessions={selectedWeekSessions} />
    </div>
  )
}
