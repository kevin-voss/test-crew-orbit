import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SessionList({ sessions = [] }) {
  const hasData = sessions.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Details</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-3">
            {sessions.map((session) => {
              const sessionDate = new Date(session.date + 'T00:00:00')
              const dayName = sessionDate.toLocaleDateString('en-US', { weekday: 'long' })
              const dateStr = sessionDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {dayName}, {dateStr}
                    </div>
                    {session.duration && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {session.duration} min
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">{session.plan}</Badge>
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
  )
}
