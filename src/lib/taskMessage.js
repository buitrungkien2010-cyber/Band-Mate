import { versionLabel, fmtShort } from './format'
import { dueLabel } from '../components/TaskCells'

// Doan tin "Viec sau buoi tap" (US-30): gom theo nguoi nhan, ten nguoi in dam kieu Zalo (*...*), kem link app
export function buildTaskMessage({ rehearsal, tasks, members, rehearsals, t, origin }) {
  const open = tasks.filter((k) => ['new', 'in_progress', 'pending_review'].includes(k.status))
  const name = (id) => members.find((m) => m.id === id)?.nickname || t('task.unassigned')
  const by = new Map()
  for (const k of open) {
    const key = k.assignee_id || 'none'
    if (!by.has(key)) by.set(key, [])
    by.get(key).push(k)
  }
  const keys = [...by.keys()].sort((a, b) => (a === 'none') - (b === 'none') || name(a).localeCompare(name(b), 'vi'))
  const lines = [`${t('zalo.title', { d: fmtShort(rehearsal.starts_at) })} (${open.length})`]
  for (const key of keys) {
    lines.push('', `*${name(key)}*`)
    for (const k of by.get(key)) {
      const song = k.song_versions ? versionLabel(k.song_versions) : t('task.general_song')
      const st = k.status === 'pending_review' ? ` [${t('task.st_pending_review')}]` : ''
      lines.push(`• ${song} · ${t(`pos.${k.position}`)}: ${k.content}${st} — ${t('task.due')}: ${dueLabel(k, rehearsals, t)}`)
    }
  }
  lines.push('', `${t('zalo.tick_hint')} ${origin}/tasks`)
  return lines.join('\n')
}
