// Pure transform of Airtable records → the exact view model the UI already consumes.
// No network here, so it can be unit-tested directly. Records are { id, fields } with
// fields keyed by Airtable field NAME (single-selects arrive as plain strings via REST;
// unchecked checkboxes and empty fields are simply absent).

const byTaskId = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true })

function longLabel(d) {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch { return d }
}

export function buildState({ meta = [], roadmap = [], tasks = [], links = [], notes = [] }, requestedDate) {
  // Meta rows → object
  const m = {}
  for (const r of meta) if (r.fields && r.fields.Key) m[r.fields.Key] = r.fields.Value
  const metaObj = {
    activeMilestone: m.activeMilestone || '',
    milestoneTarget: m.milestoneTarget || '',
    projectedFinish: m.projectedFinish || '',
    status: m.status || '',
    weekFocus: m.weekFocus || '',
  }

  // Roadmap (already sorted by Order on the query, but be defensive)
  const roadmapOut = roadmap
    .slice()
    .sort((a, b) => (a.fields.Order || 0) - (b.fields.Order || 0))
    .map(r => ({
      id: r.fields.Id,
      name: r.fields.Name,
      target: r.fields.Target,
      state: r.fields.State,
      progress: r.fields.Progress || 0,
    }))

  // Distinct Task dates, sorted ascending (ISO strings sort chronologically). The "current"
  // day is ALWAYS the maximum Date present in the data — never the device clock — so a
  // scheduled job can post a day ahead of the calendar and the site shows it. When no date
  // is requested, default to that latest (max) day; all earlier days are available read-only.
  const dates = Array.from(new Set(tasks.map(r => r.fields.Date).filter(Boolean))).sort()
  const date = requestedDate && dates.includes(requestedDate) ? requestedDate : (dates[dates.length - 1] || null)

  const dayTasks = date ? tasks.filter(r => r.fields.Date === date) : []
  // Map only the contract fields onto each task (FigmaPrompt is intentionally never surfaced).
  const toTask = r => ({ id: r.fields.TaskId, title: r.fields.Title, done_definition: r.fields.DoneDefinition })
  const today_tasks = dayTasks.filter(r => r.fields.List === 'today').map(toTask).sort(byTaskId)
  const carryover = dayTasks.filter(r => r.fields.List === 'carry').map(toTask).sort(byTaskId)

  const done = {}
  for (const r of dayTasks) if (r.fields.Done) done[`${r.fields.List}-${r.fields.TaskId}`] = true

  const linksOut = date ? links.filter(r => r.fields.Date === date).map(r => r.fields.URL).filter(Boolean) : []
  const noteRec = date ? notes.find(r => r.fields.Date === date) : null
  const notesOut = noteRec ? (noteRec.fields.Note || '') : ''

  return {
    meta: metaObj,
    roadmap: roadmapOut,
    dates,
    date,
    day: date
      ? {
          dateLabel: longLabel(date),
          milestone: metaObj.activeMilestone,
          milestoneTarget: metaObj.milestoneTarget,
          carryover,
          today_tasks,
        }
      : null,
    done,
    links: linksOut,
    notes: notesOut,
    view: 'daily', // view stays client-side (localStorage); not persisted in Airtable
  }
}
