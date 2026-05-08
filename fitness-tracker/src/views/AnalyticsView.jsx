export default function AnalyticsView() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
      <p className="text-muted-foreground">
        Charts and progress metrics will be displayed here. Use recharts via
        shadcn chart components to visualize workout data.
      </p>
    </div>
  )
}
