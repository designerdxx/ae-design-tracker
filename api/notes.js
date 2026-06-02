// POST /api/notes  { date, note }
// Sets state.notes[date]. Writes state.json.

import { mutateState, missingEnv, sendJson, readBody } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, note } = await readBody(req)
    if (!date) return sendJson(res, 400, { error: 'bad_request' })

    await mutateState(state => {
      if (note) state.notes[date] = note
      else delete state.notes[date]
    })
    sendJson(res, 200, { ok: true })
  } catch (err) {
    sendJson(res, 502, { error: 'drive_write_failed', message: String(err && err.message || err) })
  }
}
