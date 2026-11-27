import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { toInputs, fromInputs, fold, versionLabel } from '../lib/format'

// Admin tao / sua buoi tap: ngay, gio, dia diem, bai se tap (US-05)
export default function RehearsalForm({ rehearsal, onDone, onCancel }) {
  const { t } = useTranslation()
  const { member } = useAuth()
  const init = rehearsal ? toInputs(rehearsal.starts_at) : { date: '', time: '19:30' }
  const [date, setDate] = useState(init.date)
  const [time, setTime] = useState(init.time)
  const [location, setLocation] = useState(rehearsal?.location || '')
  const [notes, setNotes] = useState(rehearsal?.notes || '')
  const [picked, setPicked] = useState(rehearsal?.song_version_ids || [])
  const [versions, setVersions] = useState([])
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('song_versions').select('id, label, song_key, progress, songs(title, artist)').eq('is_active', true)
      .then(({ data }) => setVersions((data || []).map((v) => ({ ...v, name: versionLabel(v), key: fold(`${v.songs?.title} ${v.songs?.artist || ''}`) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'))))
    if (!rehearsal) {
      // dia diem lan truoc
      supabase.from('rehearsals').select('location').order('starts_at', { ascending: false }).limit(1)
        .then(({ data }) => { if (data?.[0]?.location) setLocation((l) => l || data[0].location) })
    }
  }, [rehearsal])

  const byId = useMemo(() => Object.fromEntries(versions.map((v) => [v.id, v])), [versions])
  const results = useMemo(() => {
    const f = fold(q.trim())
    if (!f) return []
    return versions.filter((v) => v.key.includes(f) && !picked.includes(v.id)).slice(0, 8)
  }, [versions, q, picked])

  const save = async (e) => {
    e.preventDefault()
    if (!date) { setMsg(t('reh.need_date')); return }
    setBusy(true); setMsg('')
    const row = { starts_at: fromInputs(date, time), location: location.trim() || null, notes: notes.trim() || null, song_version_ids: picked }
    const { error } = rehearsal
      ? await supabase.from('rehearsals').update(row).eq('id', rehearsal.id)
      : await supabase.from('rehearsals').insert({ ...row, band_id: member.band_id, created_by: member.id })
    setBusy(false)
    if (error) { setMsg(t('app.error', { msg: error.message })); return }
    onDone()
  }

  return (
    <form onSubmit={save} className="card stack">
      <h2 className="card-title">{rehearsal ? t('reh.edit') : t('reh.add')}</h2>
      <div className="row" style={{ marginTop: 0 }}>
        <label style={{ flex: 3 }}>{t('reh.date')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label style={{ flex: 2 }}>{t('reh.time')}
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <label>{t('reh.location')}
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('reh.location_ph')} />
      </label>

      <div>
        <span className="small muted">{t('reh.songs')} ({picked.length})</span>
        <ol className="picked">
          {picked.map((id, i) => (
            <li key={id}>
              <span>{i + 1}. {byId[id]?.name || '…'}</span>
              <button type="button" className="btn-x" aria-label={t('reh.remove')} onClick={() => setPicked(picked.filter((x) => x !== id))}>×</button>
            </li>
          ))}
        </ol>
        <div className="search" style={{ marginTop: 8 }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('reh.add_song')} aria-label={t('reh.add_song')} />
        </div>
        {results.length > 0 && (
          <ul className="pick-results">
            {results.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => { setPicked([...picked, v.id]); setQ('') }}>
                  + {v.name}{v.songs?.artist && <span className="muted"> — {v.songs.artist}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label>{t('reh.notes')}
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {msg && <p className="alert">{msg}</p>}
      <div className="row" style={{ marginTop: 0 }}>
        <button className="btn btn-primary" disabled={busy}>{t('app.save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('app.cancel')}</button>
      </div>
    </form>
  )
}
