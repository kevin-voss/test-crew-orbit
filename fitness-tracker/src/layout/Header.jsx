export default function Header() {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fitness Tracker</h1>
        <div className="flex items-center gap-4">
          {/* User profile or settings can go here */}
          <button className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md">
            Settings
          </button>
        </div>
      </div>
    </header>
  )
}
