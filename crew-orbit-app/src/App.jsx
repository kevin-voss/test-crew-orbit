import { useState } from 'react'
import GymWeekView from './components/GymWeekView'
import Analytics from './components/Analytics'
import { Button } from './components/ui/button'

export default function App() {
  const [currentView, setCurrentView] = useState('week')

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto flex gap-2 p-4">
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('week')}
          >
            Week View
          </Button>
          <Button
            variant={currentView === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('analytics')}
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Content */}
      {currentView === 'week' && <GymWeekView />}
      {currentView === 'analytics' && <Analytics />}
    </div>
  )
}
