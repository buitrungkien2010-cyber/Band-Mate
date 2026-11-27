import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'

export default function Home() {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const initial = (member.nickname || '?').trim().charAt(0).toUpperCase()
  return (
    <section>
      <header className="topbar">
        <div className="topbar-id">
          <img className="topbar-logo" src="/logo-192.png" alt="Logo Tạm Band" />
          <div>
            <span className="topbar-sub">Tạm Band · {t(isAdmin ? 'profile.role_admin' : 'profile.role_member')}</span>
            <h1>{t('home.hello', { name: member.nickname })}</h1>
          </div>
        </div>
        <Link to="/profile" className="avatar" aria-label={t('nav.profile')}>{initial}</Link>
      </header>
      <div className="card">
        <h2 className="card-title">{t('home.next_title')}</h2>
        <p className="muted small" style={{ margin: 0 }}>{t('home.intro')}</p>
      </div>
    </section>
  )
}
