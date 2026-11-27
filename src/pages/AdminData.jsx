import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import AdminTabs from './AdminTabs'

// Bang xuat Excel / sao luu (US-04, N4). Them bang moi o cac lat sau vao day.
export const EXPORT_TABLES = ['bands', 'members', 'songs', 'song_versions', 'rehearsals', 'tasks', 'audit_log']

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d) => new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', hour12: false })

async function fetchAll(table) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}

export default function AdminData() {
  const { t } = useTranslation()
  const { member } = useAuth()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [songCount, setSongCount] = useState(null)
  const [backups, setBackups] = useState([])

  const loadInfo = useCallback(async () => {
    const { count } = await supabase.from('songs').select('id', { count: 'exact', head: true })
    setSongCount(count ?? 0)
    const { data } = await supabase.storage.from('backups').list(member.band_id, { sortBy: { column: 'name', order: 'desc' } })
    setBackups((data || []).filter((f) => f.name.endsWith('.xlsx')))
  }, [member.band_id])

  useEffect(() => { loadInfo() }, [loadInfo])

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    setMsg(''); setParsed(null)
    if (!file) return
    setFileName(file.name); setBusy(true)
    try {
      const [XLSX, { parseSonglist }] = await Promise.all([import('xlsx'), import('../lib/masterImport')])
      const wb = XLSX.read(await file.arrayBuffer())
      const sheet = wb.Sheets.Songlist || wb.Sheets[wb.SheetNames.find((n) => n.trim().toLowerCase() === 'songlist')]
      if (!sheet) { setMsg(t('data.no_sheet')); return }
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
      const { data: mem } = await supabase.from('members').select('nickname')
      setParsed(parseSonglist(rows, (mem || []).map((m) => m.nickname)))
    } catch (err) {
      setMsg(t('app.error', { msg: err.message }))
    } finally {
      setBusy(false); e.target.value = ''
    }
  }

  const runImport = async () => {
    setBusy(true); setMsg('')
    const versions = parsed.versions.map(({ row, ...v }) => v)
    const { data, error } = await supabase.rpc('import_master', { p_versions: versions, p_members: parsed.members })
    setBusy(false)
    if (error) {
      setMsg(error.message.includes('already_imported') ? t('data.already') : t('app.error', { msg: error.message }))
      return
    }
    setParsed(null)
    setMsg(t('data.import_done', data))
    loadInfo()
  }

  const exportExcel = async () => {
    setBusy(true); setMsg('')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      for (const tb of EXPORT_TABLES) {
        const rows = (await fetchAll(tb)).map((r) =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v])))
        XLSX.utils.book_append_sheet(wb, rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([[]]), tb)
      }
      XLSX.writeFile(wb, `BandMate_${today()}.xlsx`)
      try { localStorage.setItem('bm_last_export', new Date().toISOString()) } catch { /* bo qua */ }
      setMsg(t('data.export_done'))
    } catch (err) {
      setMsg(t('app.error', { msg: err.message }))
    } finally { setBusy(false) }
  }

  const downloadBackup = async (name) => {
    const { data, error } = await supabase.storage.from('backups').createSignedUrl(`${member.band_id}/${name}`, 60)
    if (error) { setMsg(t('app.error', { msg: error.message })); return }
    window.location.href = data.signedUrl
  }

  let lastExport = null
  try { lastExport = localStorage.getItem('bm_last_export') } catch { /* bo qua */ }

  return (
    <section>
      <Link to="/profile" className="backlink">{t('admin.back')}</Link>
      <h1>{t('data.title')}</h1>
      <AdminTabs />
      {msg && <p className="note" role="status">{msg}</p>}

      <div className="card stack">
        <h2 className="card-title">{t('data.import_title')}</h2>
        {songCount > 0 ? (
          <p className="muted small" style={{ margin: 0 }}>{t('data.already_count', { n: songCount })}</p>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>{t('data.import_hint')}</p>
            <label className="btn" style={{ flexDirection: 'row' }}>
              {busy ? t('app.loading') : t('data.choose_file')}
              <input type="file" accept=".xlsx,.xls" onChange={pickFile} hidden disabled={busy} />
            </label>
          </>
        )}

        {parsed && parsed.errors.length > 0 && (
          <div className="alert" role="alert">
            <p style={{ margin: '0 0 6px' }}>{t('data.has_errors', { n: parsed.errors.length, file: fileName })}</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 400 }}>
              {parsed.errors.slice(0, 20).map((e, i) => <li key={i}>{t('data.row', { row: e.row })}: {e.msg}</li>)}
            </ul>
          </div>
        )}

        {parsed && parsed.errors.length === 0 && (
          <>
            <div className="note">
              <strong>{fileName}</strong><br />
              {t('data.preview', parsed.stats)}
              {parsed.members.length > 0 && (
                <><br />{t('data.new_members')}: {parsed.members.map((m) => m.nickname).join(', ')}</>
              )}
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={runImport} disabled={busy}>{t('data.confirm')}</button>
              <button className="btn btn-ghost" onClick={() => setParsed(null)}>{t('app.cancel')}</button>
            </div>
          </>
        )}
      </div>

      <div className="card stack">
        <h2 className="card-title">{t('data.export_title')}</h2>
        <p className="muted small" style={{ margin: 0 }}>
          {t('data.export_hint')} {lastExport && t('data.last_export', { d: fmtDate(lastExport) })}
        </p>
        <button className="btn btn-primary" onClick={exportExcel} disabled={busy}>{t('data.export')}</button>
      </div>

      <div className="card">
        <h2 className="card-title">{t('data.backup_title')}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>{t('data.backup_hint')}</p>
        {backups.length === 0 ? (
          <p className="muted small">{t('data.no_backup')}</p>
        ) : (
          <ul className="list" style={{ marginTop: 0 }}>
            {backups.map((b) => (
              <li key={b.name} className="row-between" style={{ borderTop: '1px solid var(--line)', padding: '4px 0' }}>
                <span className="small">{b.name.replace('.xlsx', '')}</span>
                <button className="btn btn-sm" onClick={() => downloadBackup(b.name)}>{t('data.download')}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
