import { useWeeklyGymStore } from '@/store/weeklyGymStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function Analytics() {
  const analyticsChartData = useWeeklyGymStore((state) => state.analyticsChartData())
  const planUsageChartData = useWeeklyGymStore((state) => state.planUsageChartData())
  const analyticsMetrics = useWeeklyGymStore((state) => state.analyticsMetrics())

  const hasData = analyticsChartData.some((d) => d.visits > 0)
  const hasPlanData = planUsageChartData.length > 0
  const planChartConfig = buildPlanChartConfig(planUsageChartData)

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Gym Visits</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <ChartContainer config={gymChartConfig} className="h-[300px]">
                <BarChart data={analyticsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
              <ChartContainer config={planChartConfig} className="h-[300px]">
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No training plans recorded this week
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
