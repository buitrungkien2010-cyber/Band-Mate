import { useTranslation } from 'react-i18next'

export default function Placeholder({ titleKey, slice }) {
  const { t } = useTranslation()
  return (
    <section>
      <h1>{t(titleKey)}</h1>
      <p className="muted">{t('app.coming', { slice })}</p>
    </section>
  )
}
