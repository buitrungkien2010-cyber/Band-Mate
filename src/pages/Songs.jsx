import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'

// SCR-06 Kho bai (rut gon, lat 1a): danh sach bai + version (tone), tim theo ten bai / ca si.
// Nhan, link, chart, chi tiet bai: lat 1b.

const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
const mmss = (sec) => (sec == null ? null : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`)
const PROGRESS = { 100: 'p100', 80: 'p80', 50: 'p50', 0: 'p0' }

export default function Songs() {
  const { t } = useTranslation()
  const [songs, setSongs] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, artist, song_versions(id, label, song_key, tempo, duration_sec, duration_estimated, progress, source_no, is_active)')
      .order('title')
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return }
        setSongs(data.map((s) => {
          const vs = (s.song_versions || []).filter((v) => v.is_active).sort((a, b) => (a.source_no ?? 0) - (b.source_no ?? 0))
          const best = vs.reduce((m, v) => Math.max(m, v.progress ?? -1), -1)
          return { ...s, versions: vs, progress: best < 0 ? null : best, key: fold(`${s.title} ${s.artist || ''}`) }
        }))
      })
  }, [])

  const stats = useMemo(() => {
    if (!songs) return null
    return { total: songs.length, full: songs.filter((s) => s.progress === 100).length }
  }, [songs])

  const shown = useMemo(() => {
    if (!songs) return []
    const f = fold(q.trim())
    return songs.filter((s) => (!f || s.key.includes(f)) && (filter === 'all'
      || (filter === 'none' ? s.progress == null : String(s.progress) === filter)))
  }, [songs, q, filter])

  const chips = [['all', t('songs.all')], ['100', t('songs.p100')], ['80', t('songs.p80')], ['50', t('songs.p50')], ['0', t('songs.p0')], ['none', t('songs.pnone')]]

  return (
    <section>
      <header className="page-head">
        <div className="topbar-id">
          <img className="page-logo" src="/logo-64.png" alt="" />
          <h1>{t('nav.songs')}</h1>
        </div>
        {stats && <span className="muted small">{t('songs.stats', stats)}</span>}
      </header>

      <div className="search">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('songs.search')} aria-label={t('songs.search')} />
      </div>

      <div className="chips" role="group" aria-label={t('songs.filter')}>
        {chips.map(([k, label]) => (
          <button key={k} type="button" className={`chip ${filter === k ? 'on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>

      {err && <p className="alert">{t('app.error', { msg: err })}</p>}
      {!songs && !err && <p className="muted small">{t('app.loading')}</p>}

      <ul className="song-list">
        {shown.map((s) => (
          <li key={s.id} className="song-row">
            <div className="song-main">
              <span className="song-title">{s.title}</span>
              {s.artist && <span className="song-meta">{s.artist}</span>}
              <div className="song-versions">
                {s.versions.map((v) => (
                  <span key={v.id} className="ver" title={v.label || ''}>
                    {v.song_key || '—'}
                    {v.label && v.label !== v.song_key && <em> · {v.label}</em>}
                    {v.tempo && <> · {v.tempo} bpm</>}
                    {v.duration_sec != null && <> · {mmss(v.duration_sec)}{v.duration_estimated && '*'}</>}
                  </span>
                ))}
              </div>
            </div>
            <span className={`prog ${s.progress == null ? 'pnone' : PROGRESS[s.progress]}`}>
              {s.progress == null ? t('songs.pnone_short') : `${s.progress}%`}
            </span>
          </li>
        ))}
      </ul>

      {songs && shown.length === 0 && <p className="muted small center-text">{t('songs.empty')}</p>}
      {songs && shown.length > 0 && (
        <p className="muted small center-text">
          {t('songs.count', { n: shown.length })}
          {shown.some((s) => s.versions.some((v) => v.duration_estimated)) && <> · {t('songs.estimated')}</>}
        </p>
      )}
    </section>
  )
}
