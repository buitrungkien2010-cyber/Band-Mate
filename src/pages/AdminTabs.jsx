import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Chuyen nhanh giua cac muc Quan tri
export default function AdminTabs() {
  const { t } = useTranslation()
  return (
    <nav className="seg admin-tabs" aria-label={t('profile.admin')}>
      <NavLink to="/admin/members" className={({ isActive }) => (isActive ? 'on' : '')}>{t('admin.tab_members')}</NavLink>
      <NavLink to="/admin/data" className={({ isActive }) => (isActive ? 'on' : '')}>{t('admin.tab_data')}</NavLink>
    </nav>
  )
}
