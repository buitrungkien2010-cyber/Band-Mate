import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fmtDate, fmtTime, daysUntil } from '../lib/format'
import RehearsalForm from './RehearsalForm'

// SCR-03 Buoi tap (US-05): danh sach buoi sap toi / da qua; Admin tao buoi
export default function Rehearsals() {
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const [list, setList] = useState(null)
  const [counts, setCounts] = useState({})
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('rehearsals').select('*').eq('status', 'scheduled').order('starts_at', { ascending: false })
    if (error) { setErr(error.message); return }
    setList(data)
    const { data: tk } = await supabase.from('tasks').select('rehearsal_id, status').neq('status', 'cancelled')
    const c = {}
    for (const x of tk || []) c[x.rehearsal_id] = (c[x.rehearsal_id] || 0) + 1
    setCounts(c)
  }, [])

  useEffect(() => { load() }, [load])

  const now = Date.now()
  const upcoming = (list || []).filter((r) => new Date(r.starts_at).getTime() >= now - 6 * 3600 * 1000).reverse()
  const past = (list || []).filter((r) => new Date(r.starts_at).getTime() < now - 6 * 3600 * 1000)

  const Row = ({ r }) => {
    const d = daysUntil(r.starts_at)
    return (
      <li>
        <Link to={`/rehearsals/${r.id}`} className="reh-row">
          <div className="song-main">
            <span className="song-title">{fmtDate(r.starts_at, i18n.language)}</span>
            <span className="song-meta">
              {fmtTime(r.starts_at)}{r.location && ` · ${r.location}`} · {t('reh.n_songs', { n: r.song_version_ids.length })}
              {counts[r.id] ? ` · ${t('reh.n_comments', { n: counts[r.id] })}` : ''}
            </span>
          </div>
          {d >= 0 && <span className="pill-accent">{d === 0 ? t('reh.today') : t('reh.in_days', { n: d })}</span>}
          <span aria-hidden className="chev">›</span>
        </Link>
      </li>
    )
  }

  return (
    <section>
      <header className="page-head">
        <div className="topbar-id">
          <img className="page-logo" src="/logo-64.png" alt="" />
          <h1>{t('nav.rehearsals')}</h1>
        </div>
      </header>

      {err && <p className="alert">{t('app.error', { msg: err })}</p>}

      {isAdmin && !adding && <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAdding(true)}>+ {t('reh.add')}</button>}
      {adding && <RehearsalForm onDone={() => { setAdding(false); load() }} onCancel={() => setAdding(false)} />}

      {!list && !err && <p className="muted small">{t('app.loading')}</p>}

      {list && (
        <>
          <h2 className="card-title" style={{ marginTop: 16 }}>{t('reh.upcoming')}</h2>
          {upcoming.length ? <ul className="song-list">{upcoming.map((r) => <Row key={r.id} r={r} />)}</ul>
            : <p className="muted small">{t('reh.none_upcoming')}</p>}
          {past.length > 0 && (
            <>
              <h2 className="card-title" style={{ marginTop: 20 }}>{t('reh.past')}</h2>
              <ul className="song-list">{past.map((r) => <Row key={r.id} r={r} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
