import * as React from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

export const ChartContext = React.createContext(null)

export function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }
  return context
}

/**
 * ChartContainer — shadcn-style wrapper for recharts charts.
 *
 * Accepts a `config` map of { [dataKey]: { label, color } } and injects
 * each color as a CSS custom property `--color-<dataKey>` so chart elements
 * can reference `var(--color-<dataKey>)` without hardcoding values.
 *
 * Usage:
 *   const config = { visits: { label: 'Visits', color: 'hsl(var(--chart-1))' } }
 *   <ChartContainer config={config} className="h-[300px]">
 *     <BarChart ...>
 *       <Bar dataKey="visits" fill="var(--color-visits)" />
 *     </BarChart>
 *   </ChartContainer>
 */
const ChartContainer = React.forwardRef(
  ({ id, className, children, config = {}, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

    const cssVarStyle = Object.fromEntries(
      Object.entries(config)
        .filter(([, c]) => c.color)
        .map(([key, c]) => [`--color-${key}`, c.color])
    )

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          style={cssVarStyle}
          className={cn(
            'flex justify-center text-xs',
            '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
            '[&_.recharts-cartesian-grid_line]:stroke-border/50',
            '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
            className
          )}
          {...props}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = 'ChartContainer'

/**
 * ChartTooltipContent — styled tooltip for use with recharts <Tooltip />.
 *
 * Reads label and color from the ChartContainer config when available.
 * Pass as: <Tooltip content={<ChartTooltipContent />} />
 */
const ChartTooltipContent = React.forwardRef(
  ({ active, payload, label, className }, ref) => {
    const { config } = useChart()

    if (!active || !payload?.length) return null

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-background px-3 py-2 text-sm shadow-sm',
          className
        )}
      >
        {label && (
          <p className="mb-1 font-medium text-foreground">{label}</p>
        )}
        <div className="space-y-1">
          {payload.map((item) => {
            const itemConfig = config[item.dataKey] ?? {}
            return (
              <div key={item.dataKey} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.fill || item.color || itemConfig.color }}
                />
                <span className="text-muted-foreground">
                  {itemConfig.label ?? item.dataKey}:
                </span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

export { ChartContainer, ChartTooltipContent }
