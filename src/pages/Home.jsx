import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'

export default function Home() {
  const { t } = useTranslation()
  const { member } = useAuth()
  return (
    <section>
      <h1>{t('home.hello', { name: member.nickname })}</h1>
      <p className="muted">{t('home.intro')}</p>
    </section>
  )
}
