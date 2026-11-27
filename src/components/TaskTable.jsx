import { useTranslation } from 'react-i18next'
import { versionLabel } from '../lib/format'
import { MemberCell, StatusCell, DueCell, NoteCell } from './TaskCells'

export const COLS = ['song', 'pos', 'member', 'text', 'status', 'due', 'note']

// Bang nhan xet 7 cot (Kien chot 27/11): Ten bai | Vi tri | Thanh vien | Nhan xet | Trang thai | Thoi han | Ghi chu.
// Khung ghi rieng: CommentForm. Dien thoai: bang vuot ngang, cot Ten bai co dinh.
export default function TaskTable({ tasks, members, rehearsals, onChange }) {
  const { t } = useTranslation()
  const label = (c) => t(`task.col_${c}`)
  const songOf = (k) => (k.song_versions ? versionLabel(k.song_versions) : t('task.general_song'))

  // gom theo bai
  const groups = []
  for (const k of tasks) {
    const key = k.song_version_id || 'general'
    let g = groups.find((x) => x.key === key)
    if (!g) { g = { key, name: songOf(k), items: [] }; groups.push(g) }
    g.items.push(k)
  }

  return (
    <>
    <div className="ttable-wrap">
      <table className="ttable t7">
        <thead>
          <tr>{COLS.map((c) => <th key={c} className={`c-${c}`}>{label(c)}</th>)}</tr>
        </thead>


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
    </div>
    <p className="scroll-hint">{t('task.scroll_hint')}</p>
    </>
  )
}
