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
      <h1 className="brand">🎸 Band Mate</h1>
      <h2>{t('login.title')}</h2>

      {noAccess && <p className="alert">{t('login.no_access')}</p>}

      {zalo ? (
        <p className="note">{t('login.zalo_hint')}</p>
      ) : (
        <>
          <button className="btn btn-google" onClick={google}>{t('login.google')}</button>
          <div className="divider">{t('login.or')}</div>
        </>
      )}

      <form onSubmit={submit} className="stack">
        <label>{t('login.username')}
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
        </label>
        <label>{t('login.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary" disabled={busy}>{t('login.submit')}</button>
      </form>
      <p className="muted small">{t('login.forgot')}</p>

      {msg && <p className="note">{msg}</p>}

      <button className="linkbtn small" onClick={() => setShowEmail(!showEmail)}>{t('login.email_link')}</button>
      {showEmail && (
        <form onSubmit={sendLink} className="row">
          <input type="email" placeholder={t('login.email_placeholder')} value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn" disabled={busy}>{t('login.email_send')}</button>
        </form>
      )}
    </div>
  )
}
