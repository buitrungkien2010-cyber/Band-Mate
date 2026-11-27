import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { versionLabel } from '../lib/format'

export const POSITIONS = ['vocal', 'drum', 'bass', 'guitar_rhythm', 'guitar_lead', 'keyboard', 'sax', 'general']

// Ghi nhan xet trong buoi tap (US-06): cham bai -> cham vi tri -> go + Gui (<= 3 cham)
export default function CommentComposer({ rehearsal, songs, onAdded }) {
  const { t } = useTranslation()
  const { member } = useAuth()
  const [song, setSong] = useState(undefined)   // undefined = chua chon, null = chung
  const [pos, setPos] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true); setMsg('')
    const { error } = await supabase.from('tasks').insert({
      band_id: member.band_id, rehearsal_id: rehearsal.id, song_version_id: song ?? null,
      position: pos || 'general', content: text.trim(),
    })
    setBusy(false)
    if (error) { setMsg(t('app.error', { msg: error.message })); return }
    setText(''); setPos(null); setMsg(t('task.saved'))   // giu bai dang chon de ghi tiep nhanh
    onAdded?.()
  }

  return (
    <form onSubmit={send} className="card stack composer">
      <h2 className="card-title" style={{ margin: 0 }}>{t('task.new_comment')}</h2>

      <div>
        <span className="small muted">1 · {t('task.pick_song')}</span>
        <div className="chips wrap">
          {songs.map((v) => (
            <button key={v.id} type="button" className={`chip ${song === v.id ? 'on' : ''}`} aria-pressed={song === v.id}
              onClick={() => setSong(v.id)}>{versionLabel(v)}</button>
          ))}
          <button type="button" className={`chip ${song === null ? 'on' : ''}`} aria-pressed={song === null}
            onClick={() => setSong(null)}>{t('task.general_song')}</button>
        </div>
      </div>

      {song !== undefined && (
        <div>
          <span className="small muted">2 · {t('task.pick_pos')}</span>
          <div className="chips wrap">
            {POSITIONS.map((p) => (
              <button key={p} type="button" className={`chip ${pos === p ? 'on' : ''}`} aria-pressed={pos === p}
                onClick={() => setPos(p)}>{t(`pos.${p}`)}</button>
            ))}
          </div>
        </div>
      )}

      {song !== undefined && pos && (
        <div className="row" style={{ marginTop: 0 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('task.content_ph')}
            aria-label={t('task.content_ph')} autoFocus enterKeyHint="send" />
          <button className="btn btn-primary" disabled={busy || !text.trim()}>{t('task.send')}</button>
        </div>
      )}
      {msg && <p className="small muted" role="status" style={{ margin: 0 }}>{msg}</p>}
    </form>
  )
}
