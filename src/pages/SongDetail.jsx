import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'

// SCR-07 Chi tiet bai (SL-05 buoc 1, US-12): moi version 1 the, nut YouTube / Chord / Lyrics mo tab moi,
// phan vai tho tu Master file. Kho bai -> bai (1 cham) -> link (2 cham).

const mmss = (sec) => (sec == null ? null : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`)

// parts: { vocal_1: ['Hà Lê'], guitar_lead: ['Kiên'], ... } -> nhan hien thi
function partLabel(t, key) {
  const m = key.match(/^(.*?)(?:_(\d+))?$/)
  const base = m[1]
  const known = t(`pos.${base}`, { defaultValue: '' })
  const name = known || base.replace(/_/g, ' ')
  return m[2] && m[2] !== '1' ? `${name} ${m[2]}` : name
}

const ORDER = ['vocal', 'guitar_lead', 'guitar_rhythm', 'guitar', 'keyboard', 'bass', 'drum', 'sax']
const rank = (k) => { const i = ORDER.findIndex((o) => k.startsWith(o)); return i < 0 ? 99 : i }

export default function SongDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [song, setSong] = useState(undefined)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('songs')
      .select('id, title, artist, song_versions(*)')
      .eq('id', id).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return }
        if (data) data.song_versions = (data.song_versions || []).filter((v) => v.is_active)
          .sort((a, b) => (a.source_no ?? 0) - (b.source_no ?? 0))
        setSong(data)
      })
  }, [id])

  if (err) return <p className="alert">{t('app.error', { msg: err })}</p>
  if (song === undefined) return <p className="muted small">{t('app.loading')}</p>
  if (!song) return <p className="muted">{t('songs.not_found')} <Link to="/songs">{t('songs.back')}</Link></p>

  return (
    <section>
      <Link to="/songs" className="backlink">← {t('songs.back')}</Link>
      <header className="page-head">
        <div>
          <h1>{song.title}</h1>
          {song.artist && <p className="muted small">{song.artist}</p>}
        </div>
      </header>

      {song.song_versions.length === 0 && <p className="muted small">{t('songs.no_versions')}</p>}

      {song.song_versions.map((v) => {
        const links = [['youtube_url', 'YouTube', 'yt'], ['chord_url', t('songs.chord'), 'chord'], ['lyrics_url', t('songs.lyrics'), 'lyr']]
          .filter(([f]) => v[f])
        const parts = Object.entries(v.parts || {}).filter(([, names]) => (names || []).length)
          .sort((a, b) => rank(a[0]) - rank(b[0]))
        return (
          <article key={v.id} className="card ver-card">
            <div className="ver-head">
              <h2>{t('songs.key')} {v.song_key || '—'}{v.label && v.label !== v.song_key && <span className="muted"> · {v.label}</span>}</h2>
              {v.progress != null && <span className={`prog p${v.progress}`}>{v.progress}%</span>}
            </div>
            <p className="muted small ver-facts">
              {[v.tempo && `${v.tempo} bpm`,
                v.duration_sec != null && `${mmss(v.duration_sec)}${v.duration_estimated ? '*' : ''}`,
                v.difficulty && `${t('songs.difficulty')}: ${v.difficulty}`].filter(Boolean).join(' · ') || '—'}
            </p>

            <div className="link-row">
              {links.map(([f, label, cls]) => (
                <a key={f} className={`btn-link ${cls}`} href={v[f]} target="_blank" rel="noopener noreferrer">{label} ↗</a>
              ))}
              {links.length === 0 && <span className="muted small">{t('songs.no_links')}</span>}
            </div>

            {parts.length > 0 && (
              <table className="parts">
                <caption className="muted small">{t('songs.parts')}</caption>
                <tbody>
                  {parts.map(([k, names]) => (
                    <tr key={k}><th scope="row">{partLabel(t, k)}</th><td>{names.join(', ')}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {v.note && <p className="small ver-note">{v.note}</p>}
          </article>
        )
      })}
      {song.song_versions.some((v) => v.duration_estimated) && <p className="muted small">{t('songs.estimated')}</p>}
    </section>
  )
}
