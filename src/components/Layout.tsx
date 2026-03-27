import { Outlet, Link } from 'react-router-dom'
import { ConnectionBanner } from './ConnectionBanner'

export default function Layout() {
  return (
    <div className="layout">
      <ConnectionBanner />
      <header className="header">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/history">History</Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
