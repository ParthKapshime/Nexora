import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Bell, BriefcaseBusiness, ChevronDown, Compass, FileUser, GraduationCap, LayoutDashboard, Menu, MessageCircle, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'

const navigation = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/profile', icon: FileUser },
  { label: 'Skills', to: '/skills', icon: Activity },
  { label: 'Learning', to: '/learning', icon: GraduationCap },
  { label: 'Projects', to: '/projects', icon: Compass },
  { label: 'Interviews', to: '/interviews', icon: MessageCircle },
  { label: 'Applications', to: '/applications', icon: BriefcaseBusiness },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const active = navigation.find((item) => item.to === location.pathname)?.label || 'Career guidance'
  const initials = user?.email?.slice(0, 1).toUpperCase() || 'N'

  return <div className="workspace-shell">
    {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Workspace sidebar">
      <Link className="brand" to="/dashboard" onClick={() => setMobileOpen(false)}>
        <span className="brand-mark"><Sparkles size={17} aria-hidden="true" /></span><span>Nexora</span>
      </Link>
      <div className="nav-caption">YOUR WORKSPACE</div>
      <nav className="primary-navigation" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="guidance-teaser"><span className="guidance-teaser-icon"><Sparkles size={16} /></span><strong>Take the next step</strong><p>Bring a career question into focus.</p><Link to="/guidance" onClick={() => setMobileOpen(false)}>Ask Nexora <span aria-hidden="true">↗</span></Link></div>
        <div className="sidebar-footer"><span>© Nexora</span><span>Your career, in focus</span></div>
      </div>
    </aside>

    <div className="workspace-main">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div>
        <div className="topbar-actions">
          <div className="popover-wrap">
            <button className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} /></button>
            {notificationsOpen && <div className="popover notification-popover"><strong>No notifications yet</strong><p>The current API doesn’t provide notifications.</p></div>}
          </div>
          <div className="popover-wrap">
            <button className="account-trigger" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}><span className="avatar">{initials}</span><span className="account-email">{user?.email}</span><ChevronDown size={15} /></button>
            {accountOpen && <div className="popover account-popover"><Link to="/profile" onClick={() => setAccountOpen(false)}>Profile & resume</Link><button onClick={logout}>Sign out</button></div>}
          </div>
        </div>
      </header>
      <main id="main-content" className="main-content"><Outlet /></main>
    </div>
  </div>
}
