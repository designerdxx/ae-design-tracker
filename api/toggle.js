// POST /api/toggle  { date, id, list, done }
// Finds the single Tasks record by Key (`<date>|<list>-<id>`) and PATCHes its Done checkbox.

import { findOne, patchRecord, eq, missingEnv, sendJson, readBody } from './_airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, id, list, done } = await readBody(req)
    if (!date || !id || !list) return sendJson(res, 400, { error: 'bad_request' })

    const rec = await findOne('Tasks', eq('Key', `${date}|${list}-${id}`))
    if (rec) await patchRecord('Tasks', rec.id, { Done: !!done })
    sendJson(res, 200, { ok: true, found: !!rec })
  } catch (err) {
    sendJson(res, 502, { error: 'airtable_write_failed', message: String((err && err.message) || err) })
  }
}
