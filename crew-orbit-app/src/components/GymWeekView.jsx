import { useWeeklyGymStore } from '@/store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SessionList from '@/components/SessionList'

export default function GymWeekView() {
  const weeklyVisitCount = useWeeklyGymStore(state => state.weeklyVisitCount())
  const weeklyPlanUsage = useWeeklyGymStore(state => state.weeklyPlanUsage())
  const analyticsChartData = useWeeklyGymStore(state => state.analyticsChartData())
  const selectedWeekSessions = useWeeklyGymStore(state => state.selectedWeekSessions())

  return (
    <div className="space-y-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">{weeklyVisitCount}</div>
              <span className="text-muted-foreground">
                session{weeklyVisitCount !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyPlanUsage.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weeklyPlanUsage.map((plan, idx) => (
                  <Badge key={idx} variant="secondary">{plan}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No plans recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session List */}
      <SessionList sessions={selectedWeekSessions} />
    </div>
  )
}
