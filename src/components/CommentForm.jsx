import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { versionLabel, toInputs } from '../lib/format'
import { nextRehearsal } from './TaskCells'
import { COLS } from './TaskTable'

export const POSITIONS = ['vocal', 'drum', 'bass', 'guitar_rhythm', 'guitar_lead', 'keyboard', 'sax', 'general']

// Khung "Ghi nhan xet" (tach rieng khoi danh sach - Kien 27/11): bang 1 dong nhap, cot giong bang Nhan xet.
export default function CommentForm({ rehearsal, songs, members, rehearsals, onChange }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const label = (c) => t(`task.col_${c}`)
  // khung ghi moi
  const blank = { song: '', pos: '', member: '', text: '', due: '', note: '' }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const nextR = nextRehearsal({ rehearsal_id: rehearsal.id }, rehearsals)
  const ready = f.song !== '' && f.pos && f.text.trim()

  const add = async (e) => {
    e.preventDefault()
    if (!ready) { setMsg(t('task.need_fields')); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.from('tasks').insert({
      band_id: member.band_id, rehearsal_id: rehearsal.id,
      song_version_id: f.song === 'general' ? null : f.song, position: f.pos, content: f.text.trim(),
      assignee_id: isAdmin && f.member ? f.member : null,
      due_date: isAdmin && f.due ? f.due : null, note: f.note.trim() || null,
    })
    setBusy(false)
    if (error) { setMsg(t('app.error', { msg: error.message })); return }
    setF({ ...blank, song: f.song })   // giu bai de ghi tiep nhanh
    setMsg(t('task.saved'))
    onChange?.()
  }


  return (
    <form onSubmit={add} className="card composer-card">
      <h2 className="card-title">{t('task.new_comment')}</h2>
      <div className="ttable-wrap">
        <table className="ttable t7">
          <thead>
            <tr>{COLS.map((c) => <th key={c} className={`c-${c}`}>{label(c)}</th>)}</tr>
          </thead>
        <tbody className="new-row">
          <tr>
            <td className="c-song" data-label={label('song')}>
              <select value={f.song} onChange={(e) => setF({ ...f, song: e.target.value })} aria-label={label('song')}>
                <option value="">{t('task.pick_song')}…</option>
                {songs.map((v) => <option key={v.id} value={v.id}>{versionLabel(v)}</option>)}
                <option value="general">{t('task.general_song')}</option>
              </select>
            </td>
            <td className="c-pos" data-label={label('pos')}>
              <select value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value })} aria-label={label('pos')}>
                <option value="">{t('task.pick_pos')}…</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{t(`pos.${p}`)}</option>)}
              </select>
            </td>
            <td className="c-member" data-label={label('member')}>
              {isAdmin ? (
                <select value={f.member} onChange={(e) => setF({ ...f, member: e.target.value })} aria-label={label('member')}>
                  <option value="">{t('task.assign_later')}</option>
                  {members.filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                </select>
              ) : <span className="muted small">{t('task.admin_assigns')}</span>}
            </td>
            <td className="c-text" data-label={label('text')}>
              <input value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={t('task.content_ph')} aria-label={label('text')} />
            </td>
            <td className="c-status" data-label={label('status')}>
              <span className={`tbadge tb-${isAdmin && f.member ? 'in_progress' : 'new'}`}>{t(`task.st_${isAdmin && f.member ? 'in_progress' : 'new'}`)}</span>
            </td>
            <td className="c-due" data-label={label('due')}>
              {isAdmin ? (
                <input type="date" value={f.due || (nextR ? toInputs(nextR.starts_at).date : '')}
                  onChange={(e) => setF({ ...f, due: e.target.value })} aria-label={label('due')} />
              ) : <span className="muted small">{t('task.due_next')}</span>}
            </td>
            <td className="c-note" data-label={label('note')}>
              <div className="cell-row">
                <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t('task.note_ph')} aria-label={label('note')} />
                <button className="btn btn-primary btn-sm" disabled={busy || !ready}>+ {t('task.add')}</button>
              </div>
            </td>
          </tr>
          {msg && <tr className="msg-row"><td colSpan={7} className="small muted">{msg}</td></tr>}
        </tbody>

        </table>
      </div>
      <p className="scroll-hint">{t('task.scroll_hint')}</p>
    </form>
  )
}
