import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children, currentView, onViewChange }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={onViewChange} />

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
