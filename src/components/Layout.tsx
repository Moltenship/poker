import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="layout">
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
