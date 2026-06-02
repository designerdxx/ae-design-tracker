// POST /api/links  { date, action: "add" | "remove", url, index? }
// Mutates state.links[date] (an array of URL strings). Writes state.json.

import { mutateState, missingEnv, sendJson, readBody } from './_drive.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    const { date, action, url, index } = await readBody(req)
    if (!date || !action) return sendJson(res, 400, { error: 'bad_request' })

    let links = []
    await mutateState(state => {
      const list = state.links[date] || []
      if (action === 'add') {
        if (url && !list.includes(url)) list.push(url)
      } else if (action === 'remove') {
        if (url) state.links[date] = list.filter(u => u !== url)
        else if (Number.isInteger(index)) { list.splice(index, 1); state.links[date] = list }
        links = state.links[date] || []
        return
      }
      state.links[date] = list
      links = list
    })
    sendJson(res, 200, { ok: true, links })
  } catch (err) {
    sendJson(res, 502, { error: 'drive_write_failed', message: String(err && err.message || err) })
  }
}
