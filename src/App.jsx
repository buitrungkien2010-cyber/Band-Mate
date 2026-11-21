import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './auth'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import AdminMembers from './pages/AdminMembers'
import Placeholder from './pages/Placeholder'

const TABS = [
  { to: '/', key: 'home', icon: '⌂' },
  { to: '/rehearsals', key: 'rehearsals', icon: '♪' },
  { to: '/tasks', key: 'tasks', icon: '✓' },
  { to: '/songs', key: 'songs', icon: '♫' },
  { to: '/profile', key: 'profile', icon: '☺' },
]

export default function App() {
  const { t } = useTranslation()
  const { session, member, isAdmin } = useAuth()

  if (session === undefined || (session && !member)) {
    return <div className="center muted">{t('app.loading')}</div>
  }
  if (!session) return <Login />

  return (
    <div className="shell">
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rehearsals" element={<Placeholder titleKey="nav.rehearsals" slice="SL-04" />} />
          <Route path="/tasks" element={<Placeholder titleKey="nav.tasks" slice="SL-04" />} />
          <Route path="/songs" element={<Placeholder titleKey="nav.songs" slice="SL-03" />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/members" element={isAdmin ? <AdminMembers /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab">
            <span className="tab-icon" aria-hidden>{tab.icon}</span>
            <span>{t(`nav.${tab.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
