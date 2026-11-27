import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import useTasks from '../lib/useTasks'
import TaskTable from '../components/TaskTable'
import { fmtDate, fmtTime, fmtShort, daysUntil } from '../lib/format'

// SCR-02 Trang chu (US-05, US-07, US-08, US-09, US-10)
// Thanh vien: buoi tap toi + Viec cua toi. Admin: them Chua gan, Cho kiem tra, K2 theo buoi.
export default function Home() {
  const { t, i18n } = useTranslation()
  const { member, isAdmin } = useAuth()
  const { tasks, members, rehearsals, reload } = useTasks()
  const [k2, setK2] = useState([])
  const initial = (member.nickname || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (isAdmin) supabase.rpc('k2_by_rehearsal').then(({ data }) => setK2((data || []).filter((r) => r.comments > 0).slice(0, 5)))
  }, [isAdmin, tasks])

  const next = rehearsals.find((r) => new Date(r.starts_at).getTime() >= Date.now() - 6 * 3600 * 1000)
  const all = tasks || []
  const mine = all.filter((k) => k.assignee_id === member.id && ['in_progress', 'pending_review'].includes(k.status))
  const unassigned = all.filter((k) => k.status === 'new')
  const toCheck = all.filter((k) => k.status === 'pending_review')
  const box = (title, list, emptyKey) => (
    <section className="home-box">
      <div className="row-between">
        <h2 className="card-title" style={{ margin: 0 }}>{title}</h2>
        <span className="grp-n">{list.length}</span>
      </div>
      {list.length === 0
        ? <p className="muted small" style={{ margin: '8px 0 0' }}>{t(emptyKey)}</p>
        : <TaskTable tasks={list} members={members} rehearsals={rehearsals} onChange={reload} filters={false} defaultGroup="none" showRehearsal />}
    </section>
  )

  return (
    <section>
      <header className="topbar">
        <div className="topbar-id">
          <img className="topbar-logo" src="/logo-192.png" alt="Logo Tạm Band" />
          <div>
            <span className="topbar-sub">Tạm Band · {t(isAdmin ? 'profile.role_admin' : 'profile.role_member')}</span>
            <h1>{t('home.hello', { name: member.nickname })}</h1>
          </div>
        </div>
        <Link to="/profile" className="avatar" aria-label={t('nav.profile')}>{initial}</Link>
      </header>

      <div className="card">
        <div className="row-between">
          <h2 className="card-title" style={{ margin: 0 }}>{t('home.next_title')}</h2>
          {next && <span className="pill-accent">{daysUntil(next.starts_at) === 0 ? t('reh.today') : t('reh.in_days', { n: daysUntil(next.starts_at) })}</span>}
        </div>
        {next ? (
          <Link to={`/rehearsals/${next.id}`} className="next-reh">
            <span className="next-date">{fmtDate(next.starts_at, i18n.language)}</span>
            <span className="muted small">{fmtTime(next.starts_at)}{next.location && ` · ${next.location}`} · {t('reh.n_songs', { n: next.song_version_ids.length })}</span>
            <span className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('home.open_reh')} →</span>
          </Link>
        ) : <p className="muted small" style={{ margin: '8px 0 0' }}>{t('reh.none_upcoming')}</p>}
      </div>

      {tasks === null ? <p className="muted small">{t('app.loading')}</p> : (
        <>
          {box(t('home.my_tasks'), mine, 'home.my_none')}
          {isAdmin && box(t('home.unassigned'), unassigned, 'home.unassigned_none')}
          {isAdmin && box(t('home.to_check'), toCheck, 'home.to_check_none')}
        </>
      )}

      {isAdmin && (
        <section className="card">
          <h2 className="card-title">{t('home.k2_title')}</h2>
          {k2.length === 0 ? <p className="muted small" style={{ margin: 0 }}>{t('home.k2_none')}</p> : (
            <table className="k2-table">
              <thead>
                <tr><th>{t('home.k2_reh')}</th><th>{t('home.k2_comments')}</th><th>{t('home.k2_assigned')}</th><th>{t('home.k2_fixed')}</th></tr>
              </thead>
              <tbody>
                {k2.map((r) => (
                  <tr key={r.rehearsal_id}>
                    <td><Link to={`/rehearsals/${r.rehearsal_id}`}>{fmtShort(r.starts_at)}</Link></td>
                    <td>{r.comments}</td>
                    <td className={r.assigned_pct === 100 ? 'ok' : ''}>{r.assigned_pct ?? '—'}{r.assigned_pct != null && '%'}</td>
                    <td className={r.fixed_pct >= 90 ? 'ok' : ''}>
                      {r.fixed_pct ?? '—'}{r.fixed_pct != null && '%'}
                      {!r.has_next && r.fixed_pct != null && <span className="muted small"> ({t('home.k2_running')})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted small" style={{ margin: '8px 0 0' }}>{t('home.k2_hint')}</p>
        </section>
      )}
    </section>
  )
}
