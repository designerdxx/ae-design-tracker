// Pure planning for the next-day promotion — no I/O, so it's unit-testable.

// Next working day after an ISO date, skipping Saturday & Sunday. Derived from a DATA value
// (the latest Date), never the device clock; uses UTC arithmetic to avoid timezone drift.
export function nextWorkingDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  let t = Date.UTC(y, m - 1, d)
  do { t += 86400000 } while ([0, 6].includes(new Date(t).getUTCDay())) // 0=Sun, 6=Sat
  const nd = new Date(t)
  const p = n => String(n).padStart(2, '0')
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`
}

// Decide what to write to promote the latest day → the next working day. Inputs are Airtable
// records ({ id, fields } keyed by field NAME); FigmaPrompt is copied forward but lives only
// server-side. Idempotent: any Tasks Key that already exists is skipped, so re-running is safe.
export function planPromotion({ taskRecs, planRecs, activeMilestone }, desiredTotal = 4) {
  const dates = Array.from(new Set(taskRecs.map(r => r.fields.Date).filter(Boolean))).sort()
  const latest = dates[dates.length - 1] || null
  if (!latest) return { latest: null, next: null, carryRows: [], newRows: [], scheduleIds: [], milestone: null }

  const next = nextWorkingDay(latest)
  const existing = new Set(taskRecs.map(r => r.fields.Key).filter(Boolean))

  // a) carryover — every incomplete task on the latest day becomes a `carry` row on NEXT
  const carryRows = []
  for (const r of taskRecs.filter(t => t.fields.Date === latest && !t.fields.Done)) {
    const key = `${next}|carry-${r.fields.TaskId}`
    if (existing.has(key)) continue
    existing.add(key)
    carryRows.push({
      Key: key, Date: next, TaskId: r.fields.TaskId, List: 'carry', Done: false,
      Title: r.fields.Title || '', DoneDefinition: r.fields.DoneDefinition || '', FigmaPrompt: r.fields.FigmaPrompt || '',
    })
  }

  // b) new — fill from the Plan backlog (already Scheduled=false, ordered) until carryover + new ≈ desiredTotal
  const newNeeded = Math.max(0, desiredTotal - carryRows.length)
  const newRows = []
  const scheduleIds = []
  let milestone = null
  for (const p of planRecs) {
    if (newRows.length >= newNeeded) break
    const key = `${next}|today-${p.fields.TaskId}`
    if (existing.has(key)) continue
    existing.add(key)
    newRows.push({
      Key: key, Date: next, TaskId: p.fields.TaskId, List: 'today', Done: false,
      Title: p.fields.Title || '', DoneDefinition: p.fields.DoneDefinition || '', FigmaPrompt: p.fields.FigmaPrompt || '',
    })
    scheduleIds.push(p.id)
    if (milestone == null && p.fields.Milestone) milestone = p.fields.Milestone
  }

  return {
    latest, next, carryRows, newRows, scheduleIds,
    // Only flag a milestone change when the promoted batch introduces a new one.
    milestone: milestone && milestone !== activeMilestone ? milestone : null,
  }
}
