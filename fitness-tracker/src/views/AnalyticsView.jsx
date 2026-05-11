import { useWeeklyGymStore } from '../store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
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

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export default function AnalyticsView() {
  // Get analytics data from store
  const dailyVisitsData = useWeeklyGymStore((state) =>
    state.analyticsChartData()
  )
  const planUsageData = useWeeklyGymStore((state) =>
    state.planUsageChartData()
  )
  const metrics = useWeeklyGymStore((state) => state.analyticsMetrics())
  const selectedWeekStart = useWeeklyGymStore((state) => state.selectedWeekStart)

  // Format week display
  const weekStart = new Date(selectedWeekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const chartConfig = {
    visits: {
      label: 'Visits',
      color: 'hsl(var(--chart-1))',
    },
  }

  const planChartConfig = {}
  planUsageData.forEach((item, idx) => {
    planChartConfig[item.name] = {
      label: item.name,
      color: COLORS[idx % COLORS.length],
    }
  })

  const hasData = dailyVisitsData.some((d) => d.visits > 0)

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          {formatDate(weekStart)} — {formatDate(weekEnd)}
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {metrics.totalSessions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Training Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {metrics.uniquePlans}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {metrics.totalDuration}
            </div>
            <p className="text-xs text-muted-foreground">minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {metrics.averageSessionDuration}
            </div>
            <p className="text-xs text-muted-foreground">minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Visits Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Gym Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <BarChart data={dailyVisitsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill={chartConfig.visits.color} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Plan Usage Chart */}
          {planUsageData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Training Plan Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={planChartConfig}>
                  <PieChart>
                    <Pie
                      data={planUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planUsageData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-2">
              No gym sessions recorded this week
            </p>
            <p className="text-xs text-muted-foreground">
              Start tracking your workouts to see analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
