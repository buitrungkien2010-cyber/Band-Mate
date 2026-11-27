import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { setLang, SKILLS } from '../i18n'
import LangSwitch from './LangSwitch'

export default function Profile() {
  const { t } = useTranslation()
  const { member, isAdmin, refreshMember, signOut } = useAuth()
  const [form, setForm] = useState({
    nickname: member.nickname || '',
    full_name: member.full_name || '',
    main_skill: member.main_skill || '',
  })
  const [msg, setMsg] = useState('')

  const save = async (patch) => {
    setMsg('')
    const { error } = await supabase.from('members').update(patch).eq('id', member.id)
    if (error) { setMsg(t('app.error', { msg: error.message })); return false }
    await refreshMember()
    setMsg(t('app.saved'))
    return true
  }

  const submit = (e) => {
    e.preventDefault()
    save({ nickname: form.nickname.trim(), full_name: form.full_name.trim() || null, main_skill: form.main_skill || null })
  }

  const changeLang = async (lang) => {
    setLang(lang)
    await save({ ui_language: lang })
  }

  return (
    <section>
      <h1>{t('profile.title')}</h1>
      <p className="muted small">
        {member.email || member.username} · {t(member.role === 'admin' ? 'profile.role_admin' : 'profile.role_member')}
      </p>

      <form onSubmit={submit} className="stack card">
        <h2 className="card-title">{t('profile.info')}</h2>
        <label>{t('profile.nickname')}
          <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required />
        </label>
        <label>{t('profile.full_name')}
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>{t('profile.main_skill')}
          <select value={form.main_skill} onChange={(e) => setForm({ ...form, main_skill: e.target.value })}>
            <option value="">{t('profile.none')}</option>
            {SKILLS.map((s) => <option key={s} value={s}>{t(`skills.${s}`)}</option>)}
          </select>
        </label>
        <button className="btn btn-primary">{t('app.save')}</button>
      </form>

      <div className="card row-between">
        <span>{t('profile.language')}</span>
        <LangSwitch onChange={changeLang} />
      </div>

      {msg && <p className="note">{msg}</p>}

      <Link className="btn" to="/guide">{t('guide.title')} →</Link>
      {isAdmin && <Link className="btn" to="/admin/members">{t('profile.admin')} →</Link>}
      {isAdmin && <Link className="btn" to="/admin/data">{t('data.title')} →</Link>}
      <button className="btn btn-ghost" onClick={signOut}>{t('profile.logout')}</button>
    </section>
  )
}
