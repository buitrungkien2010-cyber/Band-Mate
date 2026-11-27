import { useTranslation } from 'react-i18next'
import { versionLabel } from '../lib/format'
import TaskNote from './TaskNote'

// Bang nhan xet: Ten bai | Vi tri | Nhan xet | Ghi chu. Gom theo bai, ten bai chi hien o dong dau nhom.
// Dien thoai (<640px): an cot Ten bai, hien thanh dong tieu de nhom.
export default function TaskTable({ tasks, members, rehearsals, onChange }) {
  const { t } = useTranslation()
  const songOf = (k) => (k.song_versions ? versionLabel(k.song_versions) : t('task.general_song'))

  const groups = []
  for (const k of tasks) {
    const key = k.song_version_id || 'general'
    let g = groups.find((x) => x.key === key)
    if (!g) { g = { key, name: songOf(k), items: [] }; groups.push(g) }
    g.items.push(k)
  }

  return (
    <div className="ttable-wrap">
      <table className="ttable">
        <thead>
          <tr>
            <th className="c-song">{t('task.col_song')}</th>
            <th className="c-pos">{t('task.col_pos')}</th>
            <th className="c-text">{t('task.col_text')}</th>
            <th className="c-note">{t('task.col_note')}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.key}>
            <tr className="g-head"><td colSpan={3}>{g.name}</td></tr>
            {g.items.map((k, i) => (
              <tr key={k.id} className={`st-${k.status}`}>
                <td className="c-song">{i === 0 ? g.name : ''}</td>
                <td className="c-pos">{t(`pos.${k.position}`)}</td>
                <td className="c-text">{k.content}</td>
                <td className="c-note"><TaskNote task={k} members={members} rehearsals={rehearsals} onChange={onChange} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
