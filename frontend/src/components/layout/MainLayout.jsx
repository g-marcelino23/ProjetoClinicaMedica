import { useState } from 'react'
import { FaBars, FaHeartbeat } from 'react-icons/fa'
import Sidebar from './Sidebar'
import './MainLayout.css'

function MainLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className={`clinical-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onMobileClose={() => setMobileOpen(false)}
      />

      <header className="clinical-mobile-header">
        <button
          type="button"
          className="clinical-mobile-header__menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <FaBars />
        </button>
        <span className="clinical-mobile-header__brand">
          <FaHeartbeat />
          Clinical Med
        </span>
      </header>

      <main className="clinical-main">
        <div className="clinical-main__content">{children}</div>
      </main>
    </div>
  )
}

export default MainLayout
