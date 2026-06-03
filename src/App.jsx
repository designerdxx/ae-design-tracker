import { useCallback, useEffect, useRef, useState } from 'react'
import Roadmap from './Roadmap.jsx'
import Confetti from './Confetti.jsx'
import ComboMeter from './ComboMeter.jsx'
import {
  api, cachedState, cacheSnap, fetchState, seedState, viewStore,
  loadCompletedDays, saveCompletedDays, computeStreak,
} from './api.js'

const shortLabel = (date) => {
  try { return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }
  catch { return date }
}

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Item({ task, listName, done, readonly, onToggle }) {
  return (
    <div className={'item' + (done ? ' done' : '')} onClick={readonly ? undefined : () => onToggle(listName, task.id, !done)}>
      <div className="box"><Check /></div>
      <div className="txt">
        <div className="t">{task.title}</div>
        <div className="d"><b>Done =</b> {task.done_definition || task.done}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState(() => viewStore.get())
  const changeView = (v) => { setView(v); viewStore.set(v) }

  const [snap, setSnap] = useState(() => cachedState(null))
  const [figInput, setFigInput] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)
  const [removing, setRemoving] = useState(() => new Set())
  const [streak, setStreak] = useState(() => computeStreak(loadCompletedDays()))
  const [streakPulse, setStreakPulse] = useState(0)
  const streakRef = useRef(streak)

  // Navigate to a day: show the cached copy instantly, then refresh from Drive. If the
  // network (or the dev server, which has no /api) fails, fall back to a local seed.
  const goToDate = useCallback(async (targetDate) => {
    const cached = cachedState(targetDate)
    if (cached) setSnap(cached)
    setFigInput(''); setRemoving(new Set())
    try {
      setSnap(await fetchState(targetDate))
    } catch {
      if (!cached) { const s = seedState(targetDate); cacheSnap(s); setSnap(s) }
    }
  }, [])

  // Initial load. snap is already seeded from cache via useState, so here we only refresh
  // from Drive in the background (inside an async task, never a sync setState in the effect).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try { const fresh = await fetchState(null); if (alive) setSnap(fresh) }
      catch { if (alive && !cachedState(null)) { const s = seedState(null); cacheSnap(s); setSnap(s) } }
    })()
    return () => { alive = false }
  }, [])

  const day = snap && snap.day
  const dates = (snap && snap.dates) || []
  const date = snap && snap.date
  const latest = dates.length ? dates[dates.length - 1] : null
  const ro = !day || date !== latest
  const idx = dates.indexOf(date)

  const tasks = day
    ? [
        ...(day.carryover || []).map(t => ({ ...t, list: 'carry' })),
        ...(day.today_tasks || []).map(t => ({ ...t, list: 'today' })),
      ]
    : []
  const total = tasks.length
  const isDone = (s, t) => !!(s.done && s.done[`${t.list}-${t.id}`])
  const doneCount = snap ? tasks.filter(t => isDone(snap, t)).length : 0
  const pct = total ? Math.round(doneCount / total * 100) : 0
  const allDone = total > 0 && doneCount === total

  const onToggle = (list, id, done) => {
    if (ro || !snap) return
    const key = `${list}-${id}`
    const nextDone = { ...snap.done }
    if (done) nextDone[key] = true; else delete nextDone[key]
    const next = { ...snap, done: nextDone }
    const wasAll = total > 0 && tasks.every(t => snap.done[`${t.list}-${t.id}`])
    const nowAll = total > 0 && tasks.every(t => nextDone[`${t.list}-${t.id}`])
    setSnap(next); cacheSnap(next)
    if (nowAll && !wasAll) setConfettiKey(k => k + 1)
    // Streak: record/cancel this day's completion and pop the meter when it grows.
    if (nowAll !== wasAll) {
      const set = loadCompletedDays()
      if (nowAll) set[date] = true; else delete set[date]
      saveCompletedDays(set)
      const ns = computeStreak(set)
      if (ns > streakRef.current) setStreakPulse(p => p + 1)
      streakRef.current = ns
      setStreak(ns)
    }
    api.toggle(date, id, list, done).catch(() => {})
  }

  const addLink = () => {
    if (ro || !snap) return
    let v = figInput.trim(); if (!v) return
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v
    if (snap.links.includes(v)) { setFigInput(''); return }
    const next = { ...snap, links: [...snap.links, v] }
    setSnap(next); cacheSnap(next); setFigInput('')
    api.addLink(date, v).catch(() => {})
  }

  const removeLink = (url) => {
    if (ro || removing.has(url)) return
    setRemoving(prev => new Set(prev).add(url))
    api.removeLink(date, url).catch(() => {})
    window.setTimeout(() => {
      setSnap(cur => { const next = { ...cur, links: cur.links.filter(u => u !== url) }; cacheSnap(next); return next })
      setRemoving(prev => { const n = new Set(prev); n.delete(url); return n })
    }, 200)
  }

  const onNotes = (e) => {
    const val = e.target.value
    const next = { ...snap, notes: val }
    setSnap(next); cacheSnap(next)
    setSavedFlash(true); clearTimeout(window.__sv); window.__sv = setTimeout(() => setSavedFlash(false), 900)
    clearTimeout(window.__nsv); window.__nsv = setTimeout(() => api.saveNotes(date, val).catch(() => {}), 500)
  }

  const meta = (snap && snap.meta) || {}
  const atRisk = (meta.status || '').toLowerCase().includes('risk')

  const dailyCard = !day ? (
    <div className="card"><div className="empty">{snap ? 'No brief for this day yet.' : 'Loading today…'}</div></div>
  ) : (
    <div className={'card' + (ro ? ' ro' : '')}>
      <div className="head">
        <div className="titlerow">
          <h1>Due Today</h1>
          {ro && <span className="mode hist">Looking back</span>}
        </div>
        <span className="badge"><span className="dot" />{day.milestone}&nbsp;<span className="tgt">{day.milestoneTarget}</span></span>
        <div className="datenav">
          <button className="navbtn" disabled={idx <= 0} onClick={() => idx > 0 && goToDate(dates[idx - 1])} title="Previous day">‹</button>
          <select value={date} onChange={e => goToDate(e.target.value)}>
            {dates.map(d => <option key={d} value={d}>{(d === latest ? 'Today · ' : '') + shortLabel(d)}</option>)}
          </select>
          <button className="navbtn" disabled={idx >= dates.length - 1} onClick={() => idx < dates.length - 1 && goToDate(dates[idx + 1])} title="Next day">›</button>
          {ro && <span className="todaybtn" onClick={() => goToDate(latest)}>Today</span>}
        </div>
      </div>

      <div className={'progress' + (allDone ? ' complete' : '')}>
        <div className="bar"><span style={{ width: pct + '%' }} /></div>
        <div className="count">
          {total === 0 ? 'No tasks' : allDone ? 'All done' : <><b>{doneCount}</b> of {total} done</>}
        </div>
      </div>

      {day.carryover && day.carryover.length > 0 && (
        <div className="section">
          <h2>Open from before <span className="pill carry">needs a yes/no</span></h2>
          {day.carryover.map(t => <Item key={t.id} listName="carry" task={t} done={isDone(snap, { list: 'carry', id: t.id })} readonly={ro} onToggle={onToggle} />)}
        </div>
      )}

      <div className="section">
        <h2>{ro ? day.dateLabel : 'Today'}</h2>
        {day.today_tasks && day.today_tasks.length > 0
          ? day.today_tasks.map(t => <Item key={t.id} listName="today" task={t} done={isDone(snap, { list: 'today', id: t.id })} readonly={ro} onToggle={onToggle} />)
          : <div className="empty">Nothing was scheduled this day.</div>}
      </div>

      {allDone && (
        <div className="advance">
          <span className="advance-tag">Day cleared</span>
          {idx < dates.length - 1
            ? <button className="advance-btn" onClick={() => goToDate(dates[idx + 1])}>Next day <span className="advance-arrow">→</span></button>
            : <span className="advance-caught">All caught up — next brief drops soon</span>}
        </div>
      )}

      <div className="notes">
        <h2>Figma links &amp; notes</h2>
        {!ro && (
          <div className="figrow">
            <input value={figInput} onChange={e => setFigInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="Paste a Figma URL…" />
            <button onClick={addLink}>Add</button>
          </div>
        )}
        <div className="links">
          {snap.links.length === 0 && ro && <div className="links-empty">No links submitted this day.</div>}
          {snap.links.map((u) => (
            <div className={'link' + (removing.has(u) ? ' removing' : '')} key={u}>
              <span className="fig">{/figma\.com/i.test(u) ? 'FIGMA' : 'LINK'}</span>
              <a href={u} target="_blank" rel="noopener noreferrer">{u}</a>
              {!ro && <span className="x" title="Remove" onClick={() => removeLink(u)}>×</span>}
            </div>
          ))}
        </div>
        <p className="notelabel">Notes</p>
        <textarea className="notepad" value={snap.notes} onChange={onNotes} readOnly={ro}
          placeholder={ro ? 'No notes for this day.' : 'Anything worth remembering for today…'} />
        <div className={'saved' + (savedFlash ? ' show' : '')}>Saved</div>
      </div>

      <div className="foot">
        <span className="fin">Projected finish <b>{meta.projectedFinish}</b></span>
        <span className={'statustag ' + (atRisk ? 'risk' : 'ok')}><span className="dot2" />{atRisk ? 'At risk' : 'On track'}</span>
      </div>
    </div>
  )

  return (
    <div className="wrap">
      <Confetti key={confettiKey} fireKey={confettiKey} />
      <div className="switch" data-active={view}>
        <span className="switch-thumb" aria-hidden="true" />
        <button className={view === 'daily' ? 'active' : ''} onClick={() => changeView('daily')}>Daily Due</button>
        <button className={view === 'roadmap' ? 'active' : ''} onClick={() => changeView('roadmap')}>Roadmap</button>
      </div>
      <div className="view" key={view}>
        {view === 'roadmap'
          ? <Roadmap roadmap={snap && snap.roadmap} weekFocus={meta.weekFocus} projectedFinish={meta.projectedFinish} status={meta.status} dateLabel={day && day.dateLabel} />
          : dailyCard}
      </div>
      {view === 'daily' && <ComboMeter streak={streak} pulse={streakPulse} progress={total ? doneCount / total : 0} />}
    </div>
  )
}
