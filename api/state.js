// GET /api/state?date=YYYY-MM-DD
// Reads the six Airtable tables and merges them into the view model the UI consumes.
// If `date` is omitted, the latest day in Tasks is used. Reads at request time, so new
// Cowork updates appear with no redeploy.

import { listAll, missingEnv, sendJson } from './_airtable.js'
import { buildState } from './_shape.js'

// Exact field contract per table — fetch ONLY these. Note the Tasks list deliberately
// omits FigmaPrompt, so that column is never fetched, returned, or exposed to the UI.
const FIELDS = {
  Tasks: ['Key', 'Date', 'TaskId', 'List', 'Title', 'DoneDefinition', 'Done'],
  Roadmap: ['Id', 'Name', 'Target', 'State', 'Progress', 'Order'],
  Meta: ['Key', 'Value'],
  Links: ['URL', 'Date', 'Label'],
  Notes: ['Date', 'Note'],
}

export default async function handler(req, res) {
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const [meta, roadmap, tasks, links, notes] = await Promise.all([
      listAll('Meta', { fields: FIELDS.Meta }),
      listAll('Roadmap', { sort: [{ field: 'Order' }], fields: FIELDS.Roadmap }),
      listAll('Tasks', { fields: FIELDS.Tasks }),
      listAll('Links', { fields: FIELDS.Links }),
      listAll('Notes', { fields: FIELDS.Notes }),
    ])
    const requested = (req.query && req.query.date) || null
    sendJson(res, 200, buildState({ meta, roadmap, tasks, links, notes }, requested))
  } catch (err) {
    sendJson(res, 502, { error: 'airtable_read_failed', message: String((err && err.message) || err) })
  }
}
