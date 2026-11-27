import { useTranslation } from 'react-i18next'
import { versionLabel, fmtShort } from '../lib/format'
import TaskNote from './TaskNote'

// 1 viec dang the (Trang chu, man Viec): bai · vi tri, noi dung, cot Ghi chu.
export default function TaskItem({ task, members, rehearsals, onChange, showRehearsal }) {
  const { t } = useTranslation()
  const songName = task.song_versions ? versionLabel(task.song_versions) : t('task.general_song')
  return (
    <li className={`task st-${task.status}`}>
      <span className="task-meta">
        {songName} · {t(`pos.${task.position}`)}
        {showRehearsal && task.rehearsals && <> · {fmtShort(task.rehearsals.starts_at)}</>}
      </span>
      <p className="task-text">{task.content}</p>
      <TaskNote task={task} members={members} rehearsals={rehearsals} onChange={onChange} />
    </li>
  )
}
