// Thin client for the Vercel /api/* functions.
// Strategy: render from a localStorage cache instantly, then refresh from Drive in the
// background. Mutations update local state optimistically and POST in the background; the
// cache always mirrors the on-screen state, so edits survive reloads even while offline.
import { DATA, ROADMAP } from './data.js'

const ls = {
  get: (k, f) => { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v) } catch { return f } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota / private mode */ } },
}

const cacheKey = d => `askedgar:cache:${d}`
const LATEST = 'askedgar:cache:__latest__'
const VIEW = 'askedgar:view'

export const viewStore = {
  get: () => ls.get(VIEW, 'daily'),
  set: v => ls.set(VIEW, v),
}

// --- Daily streak (client-side gamification, persisted locally) ---
// A set of fully-completed day strings; the streak is the run of consecutive
// calendar days ending at the most recent completed day.
const COMPLETED_DAYS = 'askedgar:streak:days'
export function loadCompletedDays() { return ls.get(COMPLETED_DAYS, {}) }
export function saveCompletedDays(set) { ls.set(COMPLETED_DAYS, set) }
// Previous working day (skipping Sat/Sun) for an ISO date string, in UTC.
const prevWorkingDay = d => {
  const [y, m, day] = d.split('-').map(Number)
  let t = Date.UTC(y, m - 1, day)
  do { t -= 86400000 } while ([0, 6].includes(new Date(t).getUTCDay())) // 0=Sun, 6=Sat
  const nd = new Date(t)
  const p = n => String(n).padStart(2, '0')
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`
}
// The streak is a run of consecutive WORKING days. Two completed days count as adjacent
// when the lower one is the other's previous working day — so Fri→Mon carries over (the
// weekend is skipped). The streak only resets when a working day was missed (left undone).
export function computeStreak(set) {
  const days = Object.keys(set || {}).filter(d => set[d]).sort()
  if (!days.length) return 0
  let streak = 1
  let cur = days[days.length - 1]
  for (let i = days.length - 2; i >= 0; i--) {
    if (days[i] === prevWorkingDay(cur)) { streak++; cur = days[i] } else break
  }
  return streak
}

// Instant snapshot from cache (by date, or the most recently cached day).
export function cachedState(date) {
  const d = date || ls.get(LATEST, null)
  return d ? ls.get(cacheKey(d), null) : null
}

// Keep the cache in lockstep with whatever is on screen.
export function cacheSnap(snap) {
  if (!snap || !snap.date) return
  ls.set(cacheKey(snap.date), snap)
  ls.set(LATEST, snap.date)
}

export async function fetchState(date) {
  const url = '/api/state' + (date ? `?date=${encodeURIComponent(date)}` : '')
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`state ${res.status}`)
  const data = await res.json()
  cacheSnap(data)
  return data
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

export const api = {
  toggle: (date, id, list, done) => post('/api/toggle', { date, id, list, done }),
  addLink: (date, url) => post('/api/links', { date, action: 'add', url }),
  removeLink: (date, url) => post('/api/links', { date, action: 'remove', url }),
  saveNotes: (date, note) => post('/api/notes', { date, note }),
}

// Promote the next working day server-side and return its (cached) view model.
export async function nextDay() {
  const data = await post('/api/next-day', {})
  if (data && data.date) cacheSnap(data)
  return data
}

// Dev / offline seed: the same shape /api/state returns, built from the embedded Phase 1
// data so `vite dev` (no functions, no Drive) still renders the real design and is editable.
export function seedState(date) {
  const today = DATA.today
  const dates = [today]
  const d = date && dates.includes(date) ? date : today
  const mapTask = t => ({ id: t.id, title: t.title, done_definition: t.done_definition || t.done })
  return {
    meta: {
      activeMilestone: DATA.milestone,
      milestoneTarget: DATA.milestoneTarget,
      projectedFinish: DATA.projectedFinish,
      status: DATA.status,
      weekFocus: ROADMAP.weekFocus,
    },
    roadmap: ROADMAP.milestones,
    dates,
    date: d,
    day: {
      dateLabel: DATA.dateLabel,
      milestone: DATA.milestone,
      milestoneTarget: DATA.milestoneTarget,
      carryover: (DATA.carryover || []).map(mapTask),
      today_tasks: (DATA.today_tasks || []).map(mapTask),
    },
    done: {},
    links: [],
    notes: '',
    view: viewStore.get(),
    seeded: true,
  }
}
