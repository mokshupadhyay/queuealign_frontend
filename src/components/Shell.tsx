import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function Shell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  if (bare) return <>{children}</>
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Queue<span>Align</span>
        </Link>
        <nav className="nav-links">
          <Link to="/create">Create event</Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
