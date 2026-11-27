import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fmtShort } from '../lib/format'

// Cot "Ghi chu" cua 1 viec: trang thai, nguoi nhan, han, nut theo quyen (vong doi P0).
// Ten nguoi nhan chi hien 1 lan: o chon (Admin, viec con mo) hoac chu thuong (con lai).
export default function TaskNote({ task, members, rehearsals, onChange }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const mine = task.assignee_id === member.id
  const open = ['new', 'in_progress'].includes(task.status)
  const editable = isAdmin && open

  const act = async (patch) => {
    setBusy(true); setErr('')
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
    setBusy(false)
    if (error) setErr(/invalid_transition|not_allowed/.test(error.message) ? t('task.stale') : t('app.error', { msg: error.message }))
    onChange?.()
  }

  const who = (id) => members?.find((m) => m.id === id)?.nickname || '—'
  const dueText = task.due_rehearsal_id
    ? fmtShort(rehearsals?.find((r) => r.id === task.due_rehearsal_id)?.starts_at || Date.now())
    : t('task.due_next')
  const future = (rehearsals || []).filter((r) => r.id !== task.rehearsal_id && new Date(r.starts_at) > new Date())

  return (
    <div className="tnote">
      <span className={`tbadge tb-${task.status}`}>{t(`task.st_${task.status}`)}{task.reopen_count > 0 && ` · ↺${task.reopen_count}`}</span>

      {editable ? (
        <div className="tnote-fields">
          <select aria-label={t('task.assign')} value={task.assignee_id || ''} disabled={busy}
            onChange={(e) => e.target.value && act({ assignee_id: e.target.value })}>
            <option value="">{t('task.assign')}…</option>
            {(members || []).filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
          </select>
          {task.assignee_id && (
            <select aria-label={t('task.due')} value={task.due_rehearsal_id || ''} disabled={busy}
              onChange={(e) => act({ due_rehearsal_id: e.target.value || null })}>
              <option value="">{t('task.due')}: {t('task.due_next')}</option>
              {future.map((r) => <option key={r.id} value={r.id}>{t('task.due')}: {fmtShort(r.starts_at)}</option>)}
            </select>
          )}
        </div>
      ) : (
        <span className="small">
          {task.assignee_id ? <strong>{who(task.assignee_id)}</strong> : <span className="muted">{t('task.unassigned')}</span>}
          {task.assignee_id && open && <span className="muted"> · {t('task.due')}: {dueText}</span>}
        </span>
      )}

      <div className="tnote-actions">
        {mine && task.status === 'in_progress' && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act({ status: 'pending_review' })}>✓ {t('task.fixed')}</button>
        )}
        {isAdmin && task.status === 'pending_review' && (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act({ status: 'closed' })}>{t('task.close')}</button>
            <button className="btn btn-sm" disabled={busy} onClick={() => act({ status: 'in_progress' })}>↺ {t('task.reopen')}</button>
          </>
        )}
        {editable && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act({ status: 'cancelled' })}>{t('task.cancel')}</button>}
      </div>
      {task.created_by && <span className="muted tnote-by">{t('task.by', { name: who(task.created_by) })}</span>}
      {err && <p className="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  )
}
