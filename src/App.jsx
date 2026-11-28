import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './auth'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import AdminMembers from './pages/AdminMembers'
import AdminData from './pages/AdminData'
import Songs from './pages/Songs'
import SongDetail from './pages/SongDetail'
import Tasks from './pages/Tasks'
import Guide from './pages/Guide'
import Rehearsals from './pages/Rehearsals'
import RehearsalDetail from './pages/RehearsalDetail'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  home: <path {...P} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  rehearsals: <g {...P}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></g>,
  tasks: <g {...P}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></g>,
  songs: <g {...P}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></g>,
  profile: <g {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></g>,
}
const TABS = [
  { to: '/', key: 'home' },
  { to: '/rehearsals', key: 'rehearsals' },
  { to: '/tasks', key: 'tasks' },
  { to: '/songs', key: 'songs' },
  { to: '/profile', key: 'profile' },
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
          <Route path="/rehearsals" element={<Rehearsals />} />
          <Route path="/rehearsals/:id" element={<RehearsalDetail />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/songs/:id" element={<SongDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/admin/members" element={isAdmin ? <AdminMembers /> : <Navigate to="/" />} />
          <Route path="/admin/data" element={isAdmin ? <AdminData /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label={t('nav.main')}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab">
            <svg aria-hidden="true" viewBox="0 0 24 24">{ICONS[tab.key]}</svg>
            <span>{t(`nav.${tab.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
