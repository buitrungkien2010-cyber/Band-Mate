// SL-02 / N4: sao luu hang tuan. pg_cron goi 23:00 Chu nhat (gio VN) kem header x-cron-secret (lay tu Vault).
// Moi band: 1 file JSON (de khoi phuc) + 1 file .xlsx (de doc) vao bucket rieng tu "backups/<band_id>/".
// Giu 4 ban gan nhat.
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'

const TABLES = ['bands', 'members', 'songs', 'song_versions', 'audit_log'] // them bang moi o cac lat sau
const KEEP = 4

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Secret nam trong Vault (ten 'backup_cron_secret'), chi service_role doc duoc qua ham backup_cron_secret()
  const { data: secret } = await db.rpc('backup_cron_secret')
  const got = req.headers.get('x-cron-secret') ?? ''
  if (!secret || got.length !== String(secret).length || got !== secret) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }
  const stamp = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace('T', '_').replace(':', 'h')
  const { data: bands, error } = await db.from('bands').select('id')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const result: Record<string, unknown> = {}
  for (const band of bands ?? []) {
    const dump: Record<string, unknown[]> = {}
    for (const t of TABLES) {
      const rows: unknown[] = []
      for (let from = 0; ; from += 1000) {
        const q = db.from(t).select('*').range(from, from + 999)
        const { data, error: e } = await (t === 'bands' ? q.eq('id', band.id) : q.eq('band_id', band.id))
        if (e) return new Response(JSON.stringify({ error: `${t}: ${e.message}` }), { status: 500 })
        rows.push(...data)
        if (data.length < 1000) break
      }
      dump[t] = rows
    }

    const wb = XLSX.utils.book_new()
    for (const [t, rows] of Object.entries(dump)) {
      const flat = (rows as Record<string, unknown>[]).map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v])))
      XLSX.utils.book_append_sheet(wb, flat.length ? XLSX.utils.json_to_sheet(flat) : XLSX.utils.aoa_to_sheet([[]]), t)
    }
    const xlsx = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const dir = band.id
    const json = JSON.stringify({ version: 1, created_at: new Date().toISOString(), tables: dump })
    const up1 = await db.storage.from('backups').upload(`${dir}/${stamp}.json`, json, { contentType: 'application/json', upsert: true })
    const up2 = await db.storage.from('backups').upload(`${dir}/${stamp}.xlsx`, new Uint8Array(xlsx), {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true })
    if (up1.error || up2.error) {
      return new Response(JSON.stringify({ error: (up1.error ?? up2.error)!.message }), { status: 500 })
    }

    const { data: files } = await db.storage.from('backups').list(dir, { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    const stamps = [...new Set((files ?? []).map((f) => f.name.replace(/\.(json|xlsx)$/, '')))].sort().reverse()
    const old = stamps.slice(KEEP).flatMap((s) => [`${dir}/${s}.json`, `${dir}/${s}.xlsx`])
    if (old.length) await db.storage.from('backups').remove(old)
    result[band.id] = { stamp, rows: Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])), removed: old.length }
  }
  return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } })
})
