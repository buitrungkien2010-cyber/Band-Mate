// Ngay gio theo N10: dd/mm/yyyy, 24h, mui gio Asia/Bangkok
const TZ = 'Asia/Bangkok'

export function fmtDate(iso, lang = 'vi') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}
export function fmtTime(iso) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}
export function fmtShort(iso) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

// gia tri cho <input type=date|time> theo gio VN
export function toInputs(iso) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString()
  return { date: d.slice(0, 10), time: d.slice(11, 16) }
}
export function fromInputs(date, time) {
  return new Date(`${date}T${time || '19:00'}:00+07:00`).toISOString()
}

// so ngay con lai (theo ngay VN)
export function daysUntil(iso) {
  const day = (t) => Math.floor((new Date(t).getTime() + 7 * 3600 * 1000) / 86400000)
  return day(iso) - day(Date.now())
}

export const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

export function versionLabel(v) {
  const t = v.songs?.title || v.title || ''
  const k = v.song_key ? ` (${v.song_key})` : ''
  const l = v.label && v.label !== v.song_key ? ` · ${v.label}` : ''
  return `${t}${k}${l}`
}
