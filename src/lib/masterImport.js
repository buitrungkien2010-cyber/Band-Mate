// Doc sheet "Songlist" cua Master file -> du lieu cho RPC import_master (US-03, PRD 9.2)
// Kiem tra ca file truoc; co loi thi tra ve danh sach loi theo so dong Excel, khong ghi gi.

const HEADERS = {
  no: ['no'],
  song: ['song'],
  artist: ['singer/ band', 'singer/band', 'singer'],
  key: ['key'],
  tempo: ['tempo'],
  lyrics: ['lyrics'],
  chord: ['chord'],
  original: ['original version'],
  duration: ['duration'],
  difficulty: ['difficulty'],
  progress: ['progress'],
  remark: ['remark'],
}
// Cot phan vai -> vi tri (PRD Q13)
export const PART_COLS = {
  'primary vocal': 'vocal_1', 'secondary vocal': 'vocal_2', drum: 'drum', bass: 'bass',
  'rythm guitar': 'guitar_rhythm', 'rhythm guitar': 'guitar_rhythm', 'lead guitar': 'guitar_lead',
  sax: 'sax', keyboard: 'keyboard_1', 'keyboard 2': 'keyboard_2',
}
const PART_SKILL = { vocal_1: 'vocal', vocal_2: 'vocal', drum: 'drum', bass: 'bass', guitar_rhythm: 'guitar_rhythm',
  guitar_lead: 'guitar_lead', sax: 'sax', keyboard_1: 'keyboard', keyboard_2: 'keyboard' }
const NOT_PEOPLE = new Set(['khách mời', 'khach moi', 'n/a', 'na', '-', 'tbd'])
export const DEFAULT_DURATION = 272 // 0:04:32 = gia tri mac dinh chua do

const norm = (s) => String(s ?? '').trim()
const low = (s) => norm(s).toLowerCase()

export function toUsername(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 30).replace(/^(.{1,2})$/, '$1_tb')
}

export function parseDuration(v) {
  if (v === '' || v == null) return null
  if (typeof v === 'number') return Math.round(v * 86400) // o Excel kieu thoi gian = phan cua ngay
  const p = norm(v).split(':').map((x) => x.trim())
  if (!p.every((x) => /^\d+$/.test(x)) || p.length < 2 || p.length > 3) return NaN
  const n = p.map(Number)
  return p.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1]
}

function difficulty(v) {
  const s = low(v)
  if (!s) return null
  if (s.startsWith('easy')) return 'easy'
  if (s.startsWith('medium')) return 'medium'
  if (s.startsWith('hard')) return 'hard'
  return undefined
}

function splitTitle(raw) {
  const m = norm(raw).match(/^(.*?)\s*\(([^()]*)\)\s*$/)
  return m && m[1] ? { title: m[1].trim(), label: m[2].trim() } : { title: norm(raw), label: null }
}

export function splitPeople(cell) {
  const s = norm(cell)
  if (!s || NOT_PEOPLE.has(s.toLowerCase())) return []
  return s.split(/\s*[/,+&]\s*/).map((x) => x.trim()).filter((x) => x && !NOT_PEOPLE.has(x.toLowerCase()))
}

// rows: mang 2 chieu (sheet_to_json header:1). Tra ve { versions, members, errors, stats }
export function parseSonglist(rows, existingNicknames = []) {
  const errors = []
  const hIdx = rows.findIndex((r) => (r || []).some((c) => low(c) === 'song') && (r || []).some((c) => low(c) === 'key'))
  if (hIdx < 0) return { versions: [], members: [], errors: [{ row: 0, msg: 'no_header' }], stats: {} }
  const header = rows[hIdx].map(low)
  const col = {}
  for (const [k, names] of Object.entries(HEADERS)) col[k] = header.findIndex((h) => names.includes(h))
  const partCols = header.map((h, i) => [PART_COLS[h], i]).filter(([p]) => p)
  for (const k of ['song', 'key', 'duration']) if (col[k] < 0) errors.push({ row: hIdx + 1, msg: `missing_col:${k}` })
  if (errors.length) return { versions: [], members: [], errors, stats: {} }

  const versions = []
  const people = new Map() // nickname -> { count per skill }
  const get = (r, k) => (col[k] >= 0 ? r[col[k]] : '')

  rows.slice(hIdx + 1).forEach((r, i) => {
    r = r || []
    const rowNo = hIdx + 2 + i
    const song = norm(get(r, 'song'))
    if (!song) return
    const { title, label } = splitTitle(song)
    const tempoRaw = norm(get(r, 'tempo'))
    const tempo = tempoRaw === '' ? null : Number(tempoRaw)
    if (tempo !== null && (!Number.isInteger(tempo) || tempo < 20 || tempo > 400)) errors.push({ row: rowNo, msg: `tempo:${tempoRaw}` })
    const dur = parseDuration(get(r, 'duration'))
    if (Number.isNaN(dur) || (dur !== null && (dur < 1 || dur > 7200))) errors.push({ row: rowNo, msg: `duration:${norm(get(r, 'duration'))}` })
    const diff = difficulty(get(r, 'difficulty'))
    if (diff === undefined) errors.push({ row: rowNo, msg: `difficulty:${norm(get(r, 'difficulty'))}` })
    const progRaw = norm(get(r, 'progress')).replace('%', '')
    const progress = progRaw === '' ? null : Number(progRaw)
    if (progress !== null && ![0, 50, 80, 100].includes(progress)) errors.push({ row: rowNo, msg: `progress:${progRaw}%` })
    const key = norm(get(r, 'key'))
    if (key.length > 12) errors.push({ row: rowNo, msg: `key:${key}` })

    const parts = {}
    for (const [pos, ci] of partCols) {
      const names = splitPeople(r[ci])
      if (names.length) parts[pos] = names
      for (const n of names) {
        if (!people.has(n)) people.set(n, {})
        const sk = PART_SKILL[pos]
        people.get(n)[sk] = (people.get(n)[sk] || 0) + 1
      }
    }
    const no = norm(get(r, 'no'))
    versions.push({
      row: rowNo, title, label, artist: norm(get(r, 'artist')) || null, key: key || null, tempo,
      duration_sec: dur, duration_estimated: dur === DEFAULT_DURATION, difficulty: diff ?? null, progress,
      note: norm(get(r, 'remark')) || null, lyrics_url: norm(get(r, 'lyrics')) || null,
      chord_url: norm(get(r, 'chord')) || null, youtube_url: norm(get(r, 'original')) || null,
      parts: Object.keys(parts).length ? parts : null, source_no: /^\d+$/.test(no) ? Number(no) : null,
    })
  })
  if (!versions.length) errors.push({ row: hIdx + 2, msg: 'empty_file' })

  const existing = new Set(existingNicknames.map((n) => n.toLowerCase()))
  const used = new Set()
  const members = []
  for (const [nickname, skills] of people) {
    if (existing.has(nickname.toLowerCase())) continue
    let u = toUsername(nickname); let k = 2
    while (used.has(u)) u = `${toUsername(nickname).slice(0, 28)}${k++}`
    used.add(u)
    const main = Object.entries(skills).sort((a, b) => b[1] - a[1])[0][0]
    members.push({ nickname, username: u, main_skill: main })
  }
  const songs = new Set(versions.map((v) => `${v.title.toLowerCase()}|${(v.artist || '').toLowerCase()}`))
  return {
    versions, members, errors,
    stats: { songs: songs.size, versions: versions.length, members: members.length,
      estimated: versions.filter((v) => v.duration_estimated).length, no_duration: versions.filter((v) => v.duration_sec === null).length },
  }
}
