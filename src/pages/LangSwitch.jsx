import { useTranslation } from 'react-i18next'

export default function LangSwitch({ onChange }) {
  const { i18n } = useTranslation()
  return (
    <div className="seg" role="group" aria-label="Language">
      {['vi', 'en'].map((l) => (
        <button key={l} type="button" className={i18n.language === l ? 'on' : ''} onClick={() => onChange(l)}>
          {l === 'vi' ? 'VI' : 'EN'}
        </button>
      ))}
    </div>
  )
}
