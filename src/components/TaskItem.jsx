import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { versionLabel, fmtShort } from '../lib/format'

// 1 nhan xet / viec, dung chung o Buoi tap, Trang chu, Viec.
// Hanh dong theo vong doi (P0): Admin gan / doi nguoi, han, Huy, Dong, Mo lai; nguoi nhan tick Da sua.
export default function TaskItem({ task, members, rehearsals, onChange, showRehearsal }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const mine = task.assignee_id === member.id

  const act = async (patch) => {
    setBusy(true); setErr('')
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
    setBusy(false)
    if (error) {
      setErr(/invalid_transition|not_allowed/.test(error.message) ? t('task.stale') : t('app.error', { msg: error.message }))
    }
    onChange?.()
  }

  const who = (id) => members?.find((m) => m.id === id)?.nickname || '—'
  const songName = task.song_versions ? versionLabel(task.song_versions) : t('task.general_song')
  const future = (rehearsals || []).filter((r) => r.id !== task.rehearsal_id && new Date(r.starts_at) > new Date())
  const open = ['new', 'in_progress'].includes(task.status)

  return (
    <li className={`task st-${task.status}`}>
      <div className="task-head">
        <span className="task-meta">
          {songName} · {t(`pos.${task.position}`)}
          {showRehearsal && task.rehearsals && <> · {fmtShort(task.rehearsals.starts_at)}</>}
        </span>
        <span className={`tbadge tb-${task.status}`}>{t(`task.st_${task.status}`)}{task.reopen_count > 0 && ` · ↺${task.reopen_count}`}</span>
      </div>
      <p className="task-text">{task.content}</p>
      <div className="task-sub muted">
        {task.assignee_id ? <>→ <strong>{who(task.assignee_id)}</strong></> : t('task.unassigned')}
        {task.assignee_id && <> · {t('task.due')}: {task.due_rehearsal_id
          ? fmtShort(rehearsals?.find((r) => r.id === task.due_rehearsal_id)?.starts_at || Date.now())
          : t('task.due_next')}</>}
        {task.created_by && <> · {t('task.by', { name: who(task.created_by) })}</>}
      </div>

      {isAdmin && open && (
        <div className="row wrap">
          <select aria-label={t('task.assign')} value={task.assignee_id || ''} disabled={busy}
            onChange={(e) => e.target.value && act({ assignee_id: e.target.value })} style={{ flex: 2, minHeight: 40 }}>
            <option value="">{t('task.assign')}…</option>
            {(members || []).filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
          </select>
          {task.assignee_id && future.length > 0 && (
            <select aria-label={t('task.due')} value={task.due_rehearsal_id || ''} disabled={busy}
              onChange={(e) => act({ due_rehearsal_id: e.target.value || null })} style={{ flex: 1, minHeight: 40 }}>
              <option value="">{t('task.due_next')}</option>
              {future.map((r) => <option key={r.id} value={r.id}>{fmtShort(r.starts_at)}</option>)}
            </select>
          )}
          <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act({ status: 'cancelled' })}>{t('task.cancel')}</button>
        </div>
      )}

      {mine && task.status === 'in_progress' && (
        <button className="btn btn-primary btn-sm task-btn" disabled={busy} onClick={() => act({ status: 'pending_review' })}>✓ {t('task.fixed')}</button>
      )}

      {isAdmin && task.status === 'pending_review' && (
        <div className="row">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act({ status: 'closed' })}>{t('task.close')}</button>
          <button className="btn btn-sm" disabled={busy} onClick={() => act({ status: 'in_progress' })}>↺ {t('task.reopen')}</button>
        </div>
      )}
      {err && <p className="alert" style={{ marginTop: 8 }}>{err}</p>}
    </li>
  )
}
