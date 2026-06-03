// POST /api/notes  { date, note }
// Finds the Notes record for the date and PATCHes Note; creates one if none exists.

import { findOne, createRecord, patchRecord, eq, missingEnv, sendJson, readBody } from './_airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, note } = await readBody(req)
    if (!date) return sendJson(res, 400, { error: 'bad_request' })

    const rec = await findOne('Notes', eq('Date', date))
    if (rec) await patchRecord('Notes', rec.id, { Note: note || '' })
    else if (note) await createRecord('Notes', { Date: date, Note: note })
    sendJson(res, 200, { ok: true })
  } catch (err) {
    sendJson(res, 502, { error: 'airtable_write_failed', message: String((err && err.message) || err) })
  }
}
