import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { versionLabel } from '../lib/format'
import { MemberCell, StatusCell, DueCell, NoteCell } from './TaskCells'

export const COLS = ['song', 'pos', 'member', 'text', 'status', 'due', 'note']
const POS_ORDER = ['vocal', 'drum', 'bass', 'guitar_rhythm', 'guitar_lead', 'keyboard', 'sax', 'general']
const STATUS_ORDER = ['new', 'in_progress', 'pending_review', 'closed']
const FILTERS = ['song', 'pos', 'member', 'status']
const GROUP_BY = ['song', 'pos', 'member', 'status', 'none']
const NO_FILTER = { song: '', pos: '', member: '', status: '' }

// Bang nhan xet 7 cot (Kien chot 27/11): Ten bai | Vi tri | Thanh vien | Nhan xet | Trang thai | Thoi han | Ghi chu.
// Thanh loc + nhom theo truong giong nhau (Kien yeu cau 27/11). Dien thoai: vuot ngang, cot Ten bai co dinh.
export default function TaskTable({ tasks, members, rehearsals, onChange, defaultGroup = 'song' }) {
  const { t } = useTranslation()
  const label = (c) => t(`task.col_${c}`)
  const songOf = (k) => (k.song_versions ? versionLabel(k.song_versions) : t('task.general_song'))
  const nameOf = (id) => members?.find((m) => m.id === id)?.nickname

  const [flt, setFlt] = useState(NO_FILTER)
  const [groupBy, setGroupBy] = useState(defaultGroup)

  // gia tri cua 1 viec theo truong: [khoa, nhan hien thi, thu tu sap xep]
  const keyOf = (k, field) => {
    switch (field) {
      case 'song': return [k.song_version_id || 'general', songOf(k), k.song_version_id ? songOf(k) : '~']
      case 'pos': return [k.position, t(`pos.${k.position}`), POS_ORDER.indexOf(k.position)]
      case 'member': return [k.assignee_id || 'none', nameOf(k.assignee_id) || t('task.unassigned'), k.assignee_id ? nameOf(k.assignee_id) || '' : '~']
      case 'status': return [k.status, t(`task.st_${k.status}`), STATUS_ORDER.indexOf(k.status)]
      default: return ['all', '', 0]
    }
  }
  const byOrd = (a, b) => (a.ord < b.ord ? -1 : a.ord > b.ord ? 1 : 0)

  // lua chon cua tung bo loc = cac gia tri dang co trong danh sach
  const options = useMemo(() => {
    const o = {}
    for (const f of FILTERS) {
      const m = new Map()
      for (const k of tasks) { const [key, name, ord] = keyOf(k, f); if (!m.has(key)) m.set(key, { key, name, ord }) }
      o[f] = [...m.values()].sort(byOrd)
    }
    return o
  }, [tasks, members, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = tasks.filter((k) => FILTERS.every((f) => !flt[f] || keyOf(k, f)[0] === flt[f]))
  const active = Object.values(flt).some(Boolean)

  const groups = []
  for (const k of shown) {
    const [key, name, ord] = keyOf(k, groupBy)
    let g = groups.find((x) => x.key === key)
    if (!g) { g = { key, name, ord, items: [] }; groups.push(g) }
    g.items.push(k)
  }
  if (groupBy !== 'song') groups.sort(byOrd)

  return (
    <>
      <div className="tfilter" role="group" aria-label={t('task.filter')}>
        {FILTERS.map((f) => (
          <label key={f} className={flt[f] ? 'on' : ''}>
            <span>{label(f)}</span>
            <select value={flt[f]} onChange={(e) => setFlt({ ...flt, [f]: e.target.value })}>
              <option value="">{t('task.all')}</option>
              {options[f].map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
          </label>
        ))}
        <label className="grp-by">
          <span>{t('task.group_by')}</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUP_BY.map((g) => <option key={g} value={g}>{g === 'none' ? t('task.no_group') : label(g)}</option>)}
          </select>
        </label>
        {active && (
          <button type="button" className="linkbtn" onClick={() => setFlt(NO_FILTER)}>
            {t('task.clear_filter')} ({shown.length}/{tasks.length})
          </button>
        )}
      </div>

      {shown.length === 0 ? <p className="muted small">{t('task.no_match')}</p> : (
        <div className="ttable-wrap">
          <table className="ttable t7">
            <thead>
              <tr>{COLS.map((c) => <th key={c} className={`c-${c}`}>{label(c)}</th>)}</tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.key}>
                {groupBy !== 'none' && (
                  <tr className="grp-row">
                    <td className="c-song">{g.name} <span className="grp-n">{g.items.length}</span></td>
                    <td colSpan={6} />
                  </tr>
                )}
                {g.items.map((k) => (
                  <tr key={k.id} className={`st-${k.status}`}>
                    <td className="c-song">{groupBy === 'song' ? <span className="muted small">{songOf(k)}</span> : songOf(k)}</td>
                    <td className="c-pos">{t(`pos.${k.position}`)}</td>
                    <td className="c-member"><MemberCell task={k} members={members} onChange={onChange} /></td>
                    <td className="c-text">{k.content}</td>
                    <td className="c-status"><StatusCell task={k} onChange={onChange} /></td>
                    <td className="c-due"><DueCell task={k} rehearsals={rehearsals} onChange={onChange} /></td>
                    <td className="c-note"><NoteCell task={k} onChange={onChange} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <p className="scroll-hint">{t('task.scroll_hint')}</p>
    </>
  )
}
