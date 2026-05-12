import Layout from './layout/Layout'
import WeekView from './views/WeekView'
import AnalyticsView from './views/AnalyticsView'

export default function App() {
  return (
    <Layout>
      <div className="space-y-8">
        <WeekView />
        <AnalyticsView />
      </div>
    </Layout>
  )
}
