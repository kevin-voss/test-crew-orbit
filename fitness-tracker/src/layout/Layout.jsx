import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 overflow-auto p-6 bg-background">
        <div className="mx-auto max-w-screen-xl">
          {children}
        </div>
      </main>
    </div>
  )
}
