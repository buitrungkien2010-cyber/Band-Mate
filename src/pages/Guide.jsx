import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'

// N13: Huong dan 1 trang, song ngu; bao loi qua nhom Zalo
export default function Guide() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const section = (key, n) => (
    <div className="card guide">
      <h2 className="card-title">{t(`guide.${key}_title`)}</h2>
      <ol>
        {Array.from({ length: n }, (_, i) => <li key={i}>{t(`guide.${key}_${i + 1}`)}</li>)}
      </ol>
    </div>
  )
  return (
    <section>
      <Link to="/profile" className="backlink">← {t('nav.profile')}</Link>
      <h1>{t('guide.title')}</h1>
      <p className="muted small">{t('guide.intro')}</p>
      {section('login', 3)}
      {section('member', 4)}
      {isAdmin && section('admin', 5)}
      {section('status', 4)}
      <div className="card guide">
        <h2 className="card-title">{t('guide.help_title')}</h2>
        <p className="small" style={{ margin: 0 }}>{t('guide.help_1')}</p>
      </div>
    </section>
  )
}
