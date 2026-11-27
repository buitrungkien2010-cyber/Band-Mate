import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { versionLabel, toInputs } from '../lib/format'
import { MemberCell, StatusCell, DueCell, NoteCell, nextRehearsal } from './TaskCells'

export const POSITIONS = ['vocal', 'drum', 'bass', 'guitar_rhythm', 'guitar_lead', 'keyboard', 'sax', 'general']
const COLS = ['song', 'pos', 'member', 'text', 'status', 'due', 'note']

// Bang nhan xet 7 cot (Kien chot 27/11): Ten bai | Vi tri | Thanh vien | Nhan xet | Trang thai | Thoi han | Ghi chu.
// Dong dau bang = khung ghi nhan xet moi, cung cot. Dien thoai: moi dong thanh 1 the co nhan cot.
export default function TaskTable({ rehearsal, songs, tasks, members, rehearsals, onChange }) {
  const { t } = useTranslation()
  const { member, isAdmin } = useAuth()
  const label = (c) => t(`task.col_${c}`)
  const songOf = (k) => (k.song_versions ? versionLabel(k.song_versions) : t('task.general_song'))

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

  // gom theo bai
  const groups = []
  for (const k of tasks) {
    const key = k.song_version_id || 'general'
    let g = groups.find((x) => x.key === key)
    if (!g) { g = { key, name: songOf(k), items: [] }; groups.push(g) }
    g.items.push(k)
  }

  return (
    <form onSubmit={add} className="ttable-wrap">
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

        {groups.map((g) => (
          <tbody key={g.key}>
            {g.items.map((k, i) => (
              <tr key={k.id} className={`st-${k.status} ${i === 0 ? 'g-first' : ''}`}>
                <td className="c-song" data-label={label('song')}>{i === 0 ? g.name : <span className="ditto">{g.name}</span>}</td>
                <td className="c-pos" data-label={label('pos')}>{t(`pos.${k.position}`)}</td>
                <td className="c-member" data-label={label('member')}><MemberCell task={k} members={members} onChange={onChange} /></td>
                <td className="c-text" data-label={label('text')}>{k.content}</td>
                <td className="c-status" data-label={label('status')}><StatusCell task={k} onChange={onChange} /></td>
                <td className="c-due" data-label={label('due')}><DueCell task={k} rehearsals={rehearsals} onChange={onChange} /></td>
                <td className="c-note" data-label={label('note')}><NoteCell task={k} onChange={onChange} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {tasks.length === 0 && <p className="muted small" style={{ padding: '0 12px 12px', margin: 0 }}>{t('task.none')}</p>}
    </form>
  )
}
