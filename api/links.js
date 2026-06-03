// POST /api/links  { date, action: "add" | "remove", url }
// add → create a Links record (deduped by Date+URL); remove → delete matching record(s).
// Returns the current links for the date.

import { listAll, createRecord, deleteRecord, eq, and, missingEnv, sendJson, readBody } from './_airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, action, url } = await readBody(req)
    if (!date || !action) return sendJson(res, 400, { error: 'bad_request' })

    if (url && action === 'add') {
      const existing = await listAll('Links', { filterByFormula: and(eq('Date', date), eq('URL', url)) })
      if (!existing.length) await createRecord('Links', { URL: url, Date: date })
    } else if (url && action === 'remove') {
      const existing = await listAll('Links', { filterByFormula: and(eq('Date', date), eq('URL', url)) })
      await Promise.all(existing.map(r => deleteRecord('Links', r.id)))
    }

    const recs = await listAll('Links', { filterByFormula: eq('Date', date) })
    sendJson(res, 200, { ok: true, links: recs.map(r => r.fields.URL).filter(Boolean) })
  } catch (err) {
    sendJson(res, 502, { error: 'airtable_write_failed', message: String((err && err.message) || err) })
  }
}
