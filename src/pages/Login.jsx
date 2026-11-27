import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, loginEmail } from '../supabase'
import { useAuth } from '../auth'
import { setLang } from '../i18n'
import LangSwitch from './LangSwitch'

const isZalo = () => /zalo/i.test(navigator.userAgent)

export default function Login() {
  const { t } = useTranslation()
  const { noAccess, setNoAccess } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [showPw, setShowPw] = useState(false)
  const zalo = isZalo()

  const google = async () => {
    setNoAccess(false)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(''); setNoAccess(false)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(username), password })
    setBusy(false)
    if (error) setMsg(t('login.wrong'))
  }

  const sendLink = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(''); setNoAccess(false)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    setMsg(error ? t('login.no_access') : t('login.email_sent'))
  }

  return (
    <div className="login">
      <div className="login-top"><LangSwitch onChange={setLang} /></div>

      <div className="login-hero">
        <img className="login-logo" src="/logo-512.png" alt="Logo Tạm Band" />
        <p className="login-band">TẠM BAND</p>
        <p className="login-tag">{t('login.tagline')}</p>
      </div>

      <div className="login-main">
        <div className="login-head">
          <h1>{t('login.heading')}</h1>
          <p>{t('login.sub')}</p>
        </div>

        {noAccess && <p className="alert" role="alert">{t('login.no_access')}</p>}

        {zalo ? (
          <p className="note">{t('login.zalo_hint')}</p>
        ) : (
          <>
            <button className="btn btn-google" onClick={google}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              {t('login.google')}
            </button>
            <div className="divider">{t('login.or')}</div>
          </>
        )}

        <form onSubmit={submit} className="stack">
          <label>{t('login.username')}
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.username_ph')}
              autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
          </label>
          <label>{t('login.password')}
            <div className="pw">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')} autoComplete="current-password" required />
              <button type="button" aria-pressed={showPw} onClick={() => setShowPw(!showPw)}>
                {t(showPw ? 'login.hide' : 'login.show')}
              </button>
            </div>
          </label>
          <button className="btn btn-primary" disabled={busy}>{t('login.submit')}</button>
        </form>

        {msg && <p className="note" role="status">{msg}</p>}

        <div className="login-help">
          <p>{t('login.help_noacc')}</p>
          <p>{t('login.forgot')}</p>
          <p>{t('login.help_zalo')}</p>
        </div>

        <button className="linkbtn" onClick={() => setShowEmail(!showEmail)}>{t('login.email_link')}</button>
        {showEmail && (
          <form onSubmit={sendLink} className="row">
            <input type="email" placeholder={t('login.email_placeholder')} value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn" disabled={busy}>{t('login.email_send')}</button>
          </form>
        )}
      </div>
    </div>
  )
}
