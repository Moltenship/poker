import { Outlet, Link, useLocation } from 'react-router-dom'
import { ConnectionDot } from './ConnectionBanner'
import { ThemeToggle } from './ThemeToggle'

export default function Layout() {
  const location = useLocation()
  const isRoom = location.pathname.startsWith('/room/')

  if (isRoom) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-11 max-w-2xl items-center px-4">
          <Link to="/" className="text-[13px] font-semibold text-foreground">
            Planning Poker
          </Link>
          <nav className="ml-6 flex items-center gap-0.5">
            {[
              { to: '/', label: 'Home' },
              { to: '/history', label: 'History' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${
                  location.pathname === to
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ConnectionDot />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
