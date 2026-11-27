import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fmtShort, toInputs } from '../lib/format'

// O cua bang nhan xet (7 cot). Quyen theo vong doi P0; database chan lan cuoi (tasks_guard).

export function useTaskAct(task, onChange) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const act = async (patch) => {
    setBusy(true); setErr('')
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
    setBusy(false)
    if (error) setErr(/invalid_transition|not_allowed/.test(error.message) ? t('task.stale') : t('app.error', { msg: error.message }))
    onChange?.()
  }
  return { act, busy, err }
}

export const isOpen = (task) => ['new', 'in_progress'].includes(task.status)

// Buoi tap ke tiep sau buoi cua viec (mac dinh cua Thoi han)
export function nextRehearsal(task, rehearsals) {
  const cur = rehearsals?.find((r) => r.id === task.rehearsal_id)
  if (!cur) return null
  return (rehearsals || []).filter((r) => new Date(r.starts_at) > new Date(cur.starts_at))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null
}
export function dueLabel(task, rehearsals, t) {
  if (task.due_date) { const [y, m, d] = task.due_date.split('-'); return `${d}/${m}/${y.slice(2)}` }
  const n = nextRehearsal(task, rehearsals)
  return n ? `${fmtShort(n.starts_at)} (${t('task.due_next_short')})` : t('task.due_next')
}

export function MemberCell({ task, members, onChange }) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { act, busy } = useTaskAct(task, onChange)
  const name = members?.find((m) => m.id === task.assignee_id)?.nickname
  if (isAdmin && isOpen(task)) {
    return (
      <select aria-label={t('task.col_member')} value={task.assignee_id || ''} disabled={busy}
        onChange={(e) => e.target.value && act({ assignee_id: e.target.value })}>
        <option value="">{t('task.assign')}…</option>
        {(members || []).filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
      </select>
    )
  }
  return name ? <strong>{name}</strong> : <span className="muted">{t('task.unassigned')}</span>
}

export function StatusCell({ task, onChange }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const { act, busy, err } = useTaskAct(task, onChange)
  const mine = task.assignee_id === member.id
  return (
    <div className="cell-stack">
      <span className={`tbadge tb-${task.status}`}>{t(`task.st_${task.status}`)}{task.reopen_count > 0 && ` · ↺${task.reopen_count}`}</span>
      {mine && task.status === 'in_progress' && (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act({ status: 'pending_review' })}>✓ {t('task.fixed')}</button>
      )}
      {isAdmin && task.status === 'pending_review' && (
        <div className="cell-row">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act({ status: 'closed' })}>{t('task.close')}</button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act({ status: 'in_progress' })}>↺ {t('task.reopen')}</button>
        </div>
      )}
      {isAdmin && isOpen(task) && (
        <button type="button" className="linkbtn cancel-link" disabled={busy} onClick={() => act({ status: 'cancelled' })}>{t('task.cancel')}</button>
      )}
      {err && <span className="alert small">{err}</span>}
    </div>
  )
}

export function DueCell({ task, rehearsals, onChange }) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { act, busy } = useTaskAct(task, onChange)
  if (isAdmin && isOpen(task)) {
    const n = nextRehearsal(task, rehearsals)
    return (
      <div className="cell-stack">
        <input type="date" aria-label={t('task.col_due')} disabled={busy}
          value={task.due_date || (n ? toInputs(n.starts_at).date : '')}
          onChange={(e) => act({ due_date: e.target.value || null })} />
        {task.due_date
          ? <button type="button" className="linkbtn small" disabled={busy} onClick={() => act({ due_date: null })}>{t('task.due_reset')}</button>
          : <span className="muted small">{t('task.due_next')}</span>}
      </div>
    )
  }
  return <span>{dueLabel(task, rehearsals, t)}</span>
}

export function NoteCell({ task, onChange }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const { act, busy } = useTaskAct(task, onChange)
  const [v, setV] = useState(task.note || '')
  useEffect(() => { setV(task.note || '') }, [task.note])
  const can = (isAdmin || task.assignee_id === member.id) && task.status !== 'cancelled'
  if (!can) return <span className="small">{task.note || ''}</span>
  const save = () => { if ((task.note || '') !== v.trim()) act({ note: v.trim() || null }) }
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={save} disabled={busy}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      placeholder={t('task.note_ph')} aria-label={t('task.col_note')} />
  )
}
