import { useWeeklyGymStore } from '@/store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import SessionList from '@/components/SessionList'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const gymChartConfig = {
  visits: {
    label: 'Visits',
    color: 'hsl(var(--chart-1))',
  },
}

const PLAN_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function buildPlanChartConfig(data) {
  return Object.fromEntries(
    data.map((item, i) => [
      item.name,
      { label: item.name, color: PLAN_CHART_COLORS[i % PLAN_CHART_COLORS.length] },
    ])
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">
        Sessions: <span className="font-medium text-foreground">{value}</span>
      </p>
    </div>
  )
}

export default function App() {
  const weeklyVisitCount = useWeeklyGymStore(state => state.weeklyVisitCount())
  const weeklyPlanUsage = useWeeklyGymStore(state => state.weeklyPlanUsage())
  const selectedWeekStart = useWeeklyGymStore(state => state.selectedWeekStart)
  const selectedWeekSessions = useWeeklyGymStore(state => state.selectedWeekSessions())
  const analyticsChartData = useWeeklyGymStore(state => state.analyticsChartData())
  const setSelectedWeek = useWeeklyGymStore(state => state.setSelectedWeek)
  const analyticsMetrics = useWeeklyGymStore(state => state.analyticsMetrics())
  const planUsageChartData = useWeeklyGymStore(state => state.planUsageChartData())

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

  const hasChartData = analyticsChartData.some((d) => d.visits > 0)
  const hasPlanData = planUsageChartData.length > 0
  const planChartConfig = buildPlanChartConfig(planUsageChartData)

  return (
    <div className="min-h-screen bg-background">
      {/* App header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Crew Orbit</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(weekStart)} — {formatDate(weekEnd)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevWeek}>← Prev</Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>Next →</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── Week View ──────────────────────────────────────────── */}
        <section aria-label="Week view">
          <h2 className="text-base font-semibold text-foreground mb-4">Weekly Activity</h2>

          <div className="space-y-4">
            {/* 7-Day grid */}
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

            {/* Visit count + training plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Weekly Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-primary">{weeklyVisitCount}</span>
                    <span className="text-sm text-muted-foreground">
                      session{weeklyVisitCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Training Plans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weeklyPlanUsage.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {weeklyPlanUsage.map((plan, idx) => (
                        <Badge key={idx} variant="secondary">{plan}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No plans recorded yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Session list */}
            <SessionList sessions={selectedWeekSessions} />
          </div>
        </section>

        {/* ── Analytics ──────────────────────────────────────────── */}
        <section aria-label="Analytics">
          <h2 className="text-base font-semibold text-foreground mb-4">Analytics</h2>

          <div className="space-y-4">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsMetrics.totalSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Training Plans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsMetrics.uniquePlans}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsMetrics.totalDuration}</div>
                  <p className="text-xs text-muted-foreground">min</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsMetrics.averageSessionDuration}
                  </div>
                  <p className="text-xs text-muted-foreground">min</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Gym Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasChartData ? (
                    <ChartContainer config={gymChartConfig} className="h-[280px]">
                      <BarChart data={analyticsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                      No gym visits recorded this week
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Training Plan Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasPlanData ? (
                    <ChartContainer config={planChartConfig} className="h-[280px]">
                      <PieChart>
                        <Pie
                          data={planUsageChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name} (${value})`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {planUsageChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PLAN_CHART_COLORS[index % PLAN_CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                      No training plans recorded this week
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
