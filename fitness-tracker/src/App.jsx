import { useState } from 'react'
import Layout from './layout/Layout'
import WeekView from './views/WeekView'
import AnalyticsView from './views/AnalyticsView'

export default function App() {
  const [currentView, setCurrentView] = useState('week')

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'week' ? <WeekView /> : <AnalyticsView />}
    </Layout>
  )
}
