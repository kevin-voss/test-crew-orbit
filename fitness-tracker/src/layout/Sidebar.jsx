import clsx from 'clsx'

export default function Sidebar({ currentView, onViewChange }) {
  const navItems = [
    { id: 'week', label: 'Week View', icon: '📅' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <aside className="relative w-64 border-r border-border bg-card">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Menu</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                'w-full text-left px-4 py-2 rounded-md transition-colors',
                currentView === item.id
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Additional sections can be added below */}
      <div className="absolute bottom-0 left-0 w-64 border-t border-border p-6">
        <p className="text-xs text-muted-foreground">
          Ready for week view and analytics components
        </p>
      </div>
    </aside>
  )
}
