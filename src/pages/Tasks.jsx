import { useTranslation } from 'react-i18next'
import useTasks from '../lib/useTasks'
import TaskTable from '../components/TaskTable'

// SCR-04 Viec: moi viec cua band, dung chung bang 7 cot + loc / nhom; mac dinh nhom theo Thanh vien
export default function Tasks() {
  const { t } = useTranslation()
  const { tasks, members, rehearsals, err, reload } = useTasks()
  return (
    <section>
      <header className="page-head">
        <div className="topbar-id">
          <img className="page-logo" src="/logo-64.png" alt="" />
          <h1>{t('nav.tasks')}</h1>
        </div>
        {tasks && <span className="muted small">{t('task.total', { n: tasks.length })}</span>}
      </header>
      {err && <p className="alert">{t('app.error', { msg: err })}</p>}
      {tasks === null ? <p className="muted small">{t('app.loading')}</p>
        : tasks.length === 0 ? <p className="muted small">{t('task.none')}</p>
        : <TaskTable tasks={tasks} members={members} rehearsals={rehearsals} onChange={reload} defaultGroup="member" showRehearsal />}
    </section>
  )
}
