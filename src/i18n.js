import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './locales/vi.json'
import en from './locales/en.json'

function savedLang() {
  try { return localStorage.getItem('bm_lang') || 'vi' } catch { return 'vi' }
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: savedLang(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

export function setLang(lang) {
  i18n.changeLanguage(lang)
  try { localStorage.setItem('bm_lang', lang) } catch { /* ignore */ }
  document.documentElement.lang = lang
}

export const SKILLS = ['vocal', 'drum', 'bass', 'guitar_rhythm', 'guitar_lead', 'keyboard', 'sax']
export default i18n
