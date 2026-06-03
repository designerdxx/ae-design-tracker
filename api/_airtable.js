// Shared Airtable REST access for the serverless functions.
// The browser never imports this — only /api/* runs it, so the token stays server-side.
//
// One base (AIRTABLE_BASE_ID) with six tables: Tasks, Roadmap, Meta, Links, Notes, Backlog.
// Each tick/link/note touches a single record (fast), versus Drive's whole-file rewrite.
// See docs/AIRTABLE.md for the field contract.

const API = 'https://api.airtable.com/v0'
const TOKEN = process.env.AIRTABLE_TOKEN
const BASE = process.env.AIRTABLE_BASE_ID

export function missingEnv() {
  const m = []
  if (!TOKEN) m.push('AIRTABLE_TOKEN')
  if (!BASE) m.push('AIRTABLE_BASE_ID')
  return m
}

async function call(method, path, body) {
  const res = await fetch(`${API}/${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`airtable ${method} ${path.split('?')[0]} ${res.status}: ${text.slice(0, 180)}`)
  }
  if (method === 'DELETE') return res.json().catch(() => ({}))
  return res.json()
}

// Every record (follows pagination). Returns [{ id, fields }].
// `fields` restricts which columns Airtable returns — pass it to fetch ONLY the contract
// fields (e.g. so the Tasks table's FigmaPrompt column is never fetched or exposed).
export async function listAll(table, { filterByFormula, sort, fields } = {}) {
  const out = []
  let offset
  do {
    const p = new URLSearchParams()
    p.set('pageSize', '100')
    if (filterByFormula) p.set('filterByFormula', filterByFormula)
    if (offset) p.set('offset', offset)
    if (sort) sort.forEach((s, i) => {
      p.set(`sort[${i}][field]`, s.field)
      p.set(`sort[${i}][direction]`, s.direction || 'asc')
    })
    if (fields) fields.forEach(f => p.append('fields[]', f))
    const data = await call('GET', `${encodeURIComponent(table)}?${p.toString()}`)
    out.push(...(data.records || []))
    offset = data.offset
  } while (offset)
  return out
}

export function createRecord(table, fields) {
  return call('POST', encodeURIComponent(table), { fields, typecast: true })
}
export function patchRecord(table, recordId, fields) {
  return call('PATCH', `${encodeURIComponent(table)}/${recordId}`, { fields, typecast: true })
}
export function deleteRecord(table, recordId) {
  return call('DELETE', `${encodeURIComponent(table)}/${recordId}`)
}
export async function findOne(table, filterByFormula, fields) {
  const recs = await listAll(table, { filterByFormula, fields })
  return recs[0] || null
}

// Airtable formula `{Field}='value'` with single-quote escaping.
export function eq(field, value) {
  return `{${field}}='${String(value).replace(/'/g, "\\'")}'`
}
export function and(...clauses) {
  return `AND(${clauses.join(', ')})`
}

export function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

export async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}
