// GET /api/state?date=YYYY-MM-DD
// Reads the six Airtable tables and merges them into the view model the UI consumes.
// If `date` is omitted, the latest day in Tasks is used. Reads at request time, so new
// Cowork updates appear with no redeploy.

import { listAll, missingEnv, sendJson } from './_airtable.js'
import { buildState } from './_shape.js'

export default async function handler(req, res) {
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const [meta, roadmap, tasks, links, notes] = await Promise.all([
      listAll('Meta'),
      listAll('Roadmap', { sort: [{ field: 'Order' }] }),
      listAll('Tasks'),
      listAll('Links'),
      listAll('Notes'),
    ])
    const requested = (req.query && req.query.date) || null
    sendJson(res, 200, buildState({ meta, roadmap, tasks, links, notes }, requested))
  } catch (err) {
    sendJson(res, 502, { error: 'airtable_read_failed', message: String((err && err.message) || err) })
  }
}
