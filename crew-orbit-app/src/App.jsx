import { useWeeklyGymStore } from '@/store/weeklyGymStore'
import { Button } from '@/components/ui/button'
import GymWeekView from '@/components/GymWeekView'
import Analytics from '@/components/Analytics'

export default function App() {
  const selectedWeekStart = useWeeklyGymStore(state => state.selectedWeekStart)
  const setSelectedWeek = useWeeklyGymStore(state => state.setSelectedWeek)

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
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gym Tracker</h1>
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

      {/* Dashboard */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Week View Section */}
        <section aria-labelledby="week-view-heading">
          <h2 id="week-view-heading" className="text-lg font-semibold text-foreground mb-4">
            This Week
          </h2>
          <GymWeekView />
        </section>

        <div className="border-t" />

        {/* Analytics Section */}
        <section aria-labelledby="analytics-heading">
          <h2 id="analytics-heading" className="text-lg font-semibold text-foreground mb-4">
            Analytics
          </h2>
          <Analytics />
        </section>
      </main>
    </div>
  )
}
