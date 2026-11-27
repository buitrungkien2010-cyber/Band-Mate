import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Tai viec + thanh vien + buoi tap dung chung cho Trang chu, man Viec (SCR-02, SCR-04)
export const TASK_SELECT = '*, song_versions(label, song_key, songs(title)), rehearsals(starts_at)'

export default function useTasks(build) {
  const [tasks, setTasks] = useState(null)
  const [members, setMembers] = useState([])
  const [rehearsals, setRehearsals] = useState([])
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    let q = supabase.from('tasks').select(TASK_SELECT).neq('status', 'cancelled').order('created_at', { ascending: false })
    if (build) q = build(q)
    const [tk, mb, rh] = await Promise.all([
      q,
      supabase.from('members').select('id, nickname, is_active').order('nickname'),
      supabase.from('rehearsals').select('id, starts_at, location, song_version_ids').eq('status', 'scheduled').order('starts_at'),
    ])
    if (tk.error) { setErr(tk.error.message); return }
    setTasks(tk.data); setMembers(mb.data || []); setRehearsals(rh.data || [])
  }, [build])

  useEffect(() => { load() }, [load])
  return { tasks, members, rehearsals, err, reload: load }
}
