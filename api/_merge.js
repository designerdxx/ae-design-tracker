// Pure merge of feed.json + state.json into the view model the client renders.
// No Drive/googleapis import here, so it can be unit-tested directly with Node.
//
// Merge rule: tasks/roadmap/meta come from feed; done/links/notes/view come from state.
// state.done is keyed `${date}|${list}-${id}`; the returned `done` is re-keyed to
// `${list}-${id}` for just the chosen day, so the client matches it to tasks directly.

export function mergeState(feed, state, requestedDate) {
  const days = (feed && feed.days) || {}
  const dates = Object.keys(days).sort()
  const date = requestedDate && days[requestedDate] ? requestedDate : (dates[dates.length - 1] || null)
  const day = date ? days[date] : null

  const done = {}
  if (date) {
    const prefix = `${date}|`
    for (const [k, v] of Object.entries((state && state.done) || {})) {
      if (v && k.startsWith(prefix)) done[k.slice(prefix.length)] = true
    }
  }

  return {
    meta: (feed && feed.meta) || {},
    roadmap: (feed && feed.roadmap) || [],
    dates,
    date,
    day: day
      ? {
          dateLabel: day.dateLabel || date,
          milestone: day.milestone || '',
          milestoneTarget: day.milestoneTarget || '',
          carryover: day.carryover || [],
          today_tasks: day.today_tasks || [],
        }
      : null,
    done,
    links: (date && state && state.links && state.links[date]) || [],
    notes: (date && state && state.notes && state.notes[date]) || '',
    view: (state && state.view) || 'daily',
  }
}
