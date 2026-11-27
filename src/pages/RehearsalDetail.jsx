import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fmtDate, fmtTime, daysUntil, versionLabel } from '../lib/format'
import RehearsalForm from './RehearsalForm'
import TaskTable from '../components/TaskTable'
import CommentForm from '../components/CommentForm'

// Chi tiet buoi tap: thong tin, bai se tap, link gui Zalo (US-05). Nhan xet: buoc 3.
export default function RehearsalDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const [r, setR] = useState(null)
  const [songs, setSongs] = useState([])
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [allReh, setAllReh] = useState([])

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from('tasks')
      .select('*, song_versions(label, song_key, songs(title))')
      .eq('rehearsal_id', id).neq('status', 'cancelled').order('created_at')
    setTasks(data || [])
  }, [id])

  useEffect(() => {
    loadTasks()
    supabase.from('members').select('id, nickname, is_active').order('nickname').then(({ data }) => setMembers(data || []))
    supabase.from('rehearsals').select('id, starts_at').eq('status', 'scheduled').order('starts_at').then(({ data }) => setAllReh(data || []))
  }, [loadTasks])

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('rehearsals').select('*').eq('id', id).maybeSingle()
    if (error || !data) { setMsg(t('reh.not_found')); return }
    setR(data)
    if (data.song_version_ids.length) {
      const { data: vs } = await supabase.from('song_versions').select('id, label, song_key, tempo, songs(title, artist)').in('id', data.song_version_ids)
      const m = Object.fromEntries((vs || []).map((v) => [v.id, v]))
      setSongs(data.song_version_ids.map((x) => m[x]).filter(Boolean))
    } else setSongs([])
  }, [id, t])

  useEffect(() => { load() }, [load])

  const link = `${window.location.origin}/rehearsals/${id}`
  const share = async () => {
    const text = `${t('reh.share_title')}: ${fmtDate(r.starts_at, i18n.language)} ${fmtTime(r.starts_at)}${r.location ? ` — ${r.location}` : ''}\n`
      + songs.map((v, i) => `${i + 1}. ${versionLabel(v)}`).join('\n') + `\n${link}`
    try {
      if (navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setMsg(t('reh.copied'))
    } catch { /* nguoi dung huy */ }
  }

  const cancelRehearsal = async () => {
    if (!window.confirm(t('reh.cancel_confirm'))) return
    const { error } = await supabase.from('rehearsals').update({ status: 'cancelled' }).eq('id', id)
    if (error) setMsg(t('app.error', { msg: error.message }))
    else nav('/rehearsals')
  }

  if (!r) return <section><Link to="/rehearsals" className="backlink">← {t('nav.rehearsals')}</Link>{msg && <p className="note">{msg}</p>}</section>
  const d = daysUntil(r.starts_at)

  return (
    <section>
      <Link to="/rehearsals" className="backlink">← {t('nav.rehearsals')}</Link>
      {editing ? (
        <RehearsalForm rehearsal={r} onDone={() => { setEditing(false); load() }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="card stack">
          <div className="row-between">
            <h2 className="card-title" style={{ margin: 0 }}>{t('reh.title')}</h2>
            {d >= 0 && <span className="pill-accent">{d === 0 ? t('reh.today') : t('reh.in_days', { n: d })}</span>}
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{fmtDate(r.starts_at, i18n.language)}</div>
            <div className="muted small">{fmtTime(r.starts_at)}{r.location && ` · ${r.location}`}</div>
            {r.notes && <p className="small" style={{ marginBottom: 0 }}>{r.notes}</p>}
          </div>
          <div>
            <span className="small muted">{t('reh.songs')} ({songs.length})</span>
            {songs.length ? (
              <ol className="picked">
                {songs.map((v, i) => <li key={v.id}><span>{i + 1}. {versionLabel(v)}{v.tempo ? ` · ${v.tempo} bpm` : ''}</span></li>)}
              </ol>
            ) : <p className="muted small">{t('reh.no_songs')}</p>}
          </div>
          <button className="btn" onClick={share}>{t('reh.share')}</button>
          {isAdmin && (
            <div className="row" style={{ marginTop: 0 }}>
              <button className="btn btn-sm" onClick={() => setEditing(true)}>{t('reh.edit')}</button>
              <button className="btn btn-sm btn-ghost" onClick={cancelRehearsal}>{t('reh.cancel')}</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="note" role="status">{msg}</p>}
      <CommentForm rehearsal={r} songs={songs} members={members} rehearsals={allReh} onChange={loadTasks} />

      <h2 className="card-title" style={{ marginTop: 16 }}>{t('task.list_title', { n: tasks.length })}</h2>
      {tasks.length === 0 ? <p className="muted small">{t('task.none')}</p>
        : <TaskTable tasks={tasks} members={members} rehearsals={allReh} onChange={loadTasks} />}
    </section>
  )
}
