// GET /api/state?date=YYYY-MM-DD
// Downloads feed.json + state.json, merges them, returns the view model for one day.
// If `date` is omitted, the latest day in feed.days is used. Reads happen at request
// time, so a new Cowork brief shows up with no redeploy.

import { readJson, FEED_FILE, STATE_FILE, missingEnv, sendJson } from './_drive.js'
import { mergeState } from './_merge.js'

export default async function handler(req, res) {
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const [feed, state] = await Promise.all([
      readJson(FEED_FILE, { meta: {}, days: {}, roadmap: [], backlog: [] }),
      readJson(STATE_FILE, { done: {}, links: {}, notes: {}, view: 'daily' }),
    ])
    const requested = (req.query && req.query.date) || null
    sendJson(res, 200, mergeState(feed, state, requested))
  } catch (err) {
    sendJson(res, 502, { error: 'drive_read_failed', message: String((err && err.message) || err) })
  }
}
