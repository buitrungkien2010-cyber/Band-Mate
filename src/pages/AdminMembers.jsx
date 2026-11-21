import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { SKILLS } from '../i18n'

const empty = { nickname: '', full_name: '', email: '', username: '', role: 'member', main_skill: '' }

function errText(t, error) {
  const m = error?.message || String(error)
  if (m.includes('last_admin')) return t('admin.last_admin')
  return t('app.error', { msg: m })
}

export default function AdminMembers() {
  const { t } = useTranslation()
  const { member: me, refreshMember } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState(empty)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwFor, setPwFor] = useState(null)
  const [pw, setPw] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('members').select('*').order('is_active', { ascending: false }).order('nickname')
    if (error) setMsg(errText(t, error))
    else setList(data)
  }, [t])

  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    setMsg('')
    const row = {
      band_id: me.band_id,
      nickname: form.nickname.trim(),
      full_name: form.full_name.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      username: form.username.trim().toLowerCase() || null,
      role: form.role,
      main_skill: form.main_skill || null,
    }
    if (!row.email && !row.username) { setMsg(t('admin.need_login')); return }
    const { error } = await supabase.from('members').insert(row)
    if (error) { setMsg(errText(t, error)); return }
    setForm(empty); setShowAdd(false); setMsg(t('app.saved'))
    load()
  }

  const update = async (m, patch) => {
    setMsg('')
    const { error } = await supabase.from('members').update(patch).eq('id', m.id)
    if (error) { setMsg(errText(t, error)); return }
    if (m.id === me.id) await refreshMember()
    load()
  }

  const setPassword = async (e) => {
    e.preventDefault()
    setMsg('')
    const { data, error } = await supabase.functions.invoke('admin-set-password', {
      body: { member_id: pwFor.id, password: pw },
    })
    if (error || data?.error) { setMsg(t('app.error', { msg: data?.error || error.message })); return }
    setMsg(t('admin.password_done', { name: pwFor.nickname }))
    setPwFor(null); setPw('')
    load()
  }

  return (
    <section>
      <Link to="/profile" className="muted small">{t('admin.back')}</Link>
      <h1>{t('admin.title')}</h1>

      {msg && <p className="note">{msg}</p>}

      {!showAdd ? (
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ {t('admin.add')}</button>
      ) : (
        <form onSubmit={add} className="stack card">
          <label>{t('profile.nickname')}
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required />
          </label>
          <label>{t('profile.full_name')}
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </label>
          <label>{t('admin.email')}
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>{t('admin.username')}
            <input value={form.username} pattern="[a-z0-9._\-]{3,30}" autoCapitalize="none"
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
          </label>
          <label>{t('profile.main_skill')}
            <select value={form.main_skill} onChange={(e) => setForm({ ...form, main_skill: e.target.value })}>
              <option value="">{t('profile.none')}</option>
              {SKILLS.map((s) => <option key={s} value={s}>{t(`skills.${s}`)}</option>)}
            </select>
          </label>
          <label>{t('admin.role')}
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="member">{t('profile.role_member')}</option>
              <option value="admin">{t('profile.role_admin')}</option>
            </select>
          </label>
          <div className="row">
            <button className="btn btn-primary">{t('app.save')}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>{t('app.cancel')}</button>
          </div>
        </form>
      )}

      <ul className="list">
        {list.map((m) => (
          <li key={m.id} className={`card ${m.is_active ? '' : 'dim'}`}>
            <div className="row-between">
              <strong>{m.nickname}</strong>
              <span className={`badge ${m.role === 'admin' ? 'badge-admin' : ''}`}>
                {t(m.role === 'admin' ? 'profile.role_admin' : 'profile.role_member')}
              </span>
            </div>
            <div className="muted small">
              {[m.main_skill && t(`skills.${m.main_skill}`), m.email, m.username && `@${m.username}`].filter(Boolean).join(' · ')}
            </div>
            <div className="muted small">
              {m.is_active ? t('admin.active') : t('admin.inactive')}
              {m.google_user_id && ` · ${t('admin.linked_google')}`}
              {m.login_user_id && ` · ${t('admin.linked_login')}`}
            </div>
            <div className="row wrap">
              {m.is_active && (
                <button className="btn btn-sm" onClick={() => update(m, { role: m.role === 'admin' ? 'member' : 'admin' })}>
                  {t(m.role === 'admin' ? 'admin.make_member' : 'admin.make_admin')}
                </button>
              )}
              {m.username && m.is_active && (
                <button className="btn btn-sm" onClick={() => { setPwFor(m); setPw('') }}>
                  {t(m.login_user_id ? 'admin.reset_password' : 'admin.set_password')}
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => update(m, { is_active: !m.is_active })}>
                {t(m.is_active ? 'admin.deactivate' : 'admin.activate')}
              </button>
            </div>
            {pwFor?.id === m.id && (
              <form onSubmit={setPassword} className="stack">
                <label>{t('admin.password_prompt', { name: m.nickname })}
                  <input type="text" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />
                </label>
                <div className="row">
                  <button className="btn btn-primary btn-sm">{t('app.save')}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPwFor(null)}>{t('app.cancel')}</button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
