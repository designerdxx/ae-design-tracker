// POST /api/toggle  { date, id, list, done }
// Sets state.done[`${date}|${list}-${id}`]. Writes state.json. Never touches feed.json.

import { mutateState, missingEnv, sendJson, readBody } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, id, list, done } = await readBody(req)
    if (!date || !id || !list) return sendJson(res, 400, { error: 'bad_request' })

    const key = `${date}|${list}-${id}`
    await mutateState(state => {
      if (done) state.done[key] = true
      else delete state.done[key]
    })
    sendJson(res, 200, { ok: true })
  } catch (err) {
    sendJson(res, 502, { error: 'drive_write_failed', message: String(err && err.message || err) })
  }
}
