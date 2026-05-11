import { useWeeklyGymStore } from '../store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WeekView() {
  // Read from Zustand store - derived data only
  const weeklyVisitCount = useWeeklyGymStore(
    (state) => state.weeklyVisitCount()
  )
  const weeklyPlanUsage = useWeeklyGymStore(
    (state) => state.weeklyPlanUsage()
  )
  const selectedWeekSessions = useWeeklyGymStore(
    (state) => state.selectedWeekSessions()
  )
  const selectedWeekStart = useWeeklyGymStore(
    (state) => state.selectedWeekStart
  )

  // Format week display
  const weekStart = new Date(selectedWeekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const hasData = selectedWeekSessions.length > 0

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Week View</h1>
        <p className="text-muted-foreground">
          {formatDate(weekStart)} — {formatDate(weekEnd)}
        </p>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visit Count Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-accent">
                {weeklyVisitCount}
              </div>
              <span className="text-muted-foreground">
                session{weeklyVisitCount !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Plans Used Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyPlanUsage.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weeklyPlanUsage.map((plan, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground"
                  >
                    {plan}
                  </span>
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

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-3">
              {selectedWeekSessions.map((session) => {
                const sessionDate = new Date(session.date)
                const dayName = sessionDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                })
                const dateStr = formatDate(sessionDate)

                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {dayName}, {dateStr}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Plan: <span className="font-medium">{session.plan}</span>
                      </div>
                      {session.duration && (
                        <div className="text-sm text-muted-foreground">
                          Duration: {session.duration}min
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">
                No gym sessions recorded this week
              </p>
              <p className="text-xs text-muted-foreground">
                Start tracking your workouts to see them here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
