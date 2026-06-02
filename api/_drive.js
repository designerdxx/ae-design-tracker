// Shared Google Drive access for the serverless functions.
// The browser never imports this — only /api/* runs it, so Google creds stay server-side.
//
// Two JSON files live in one Drive folder (DRIVE_FOLDER_ID):
//   feed.json  — written ONLY by the Cowork jobs (tasks, roadmap, meta, backlog)
//   state.json — written ONLY by this website (done ticks, links, notes, view)
// Files are resolved by name, newest modifiedTime wins (Cowork's connector may
// create a fresh revision rather than overwriting in place).

import { google } from 'googleapis'

const FOLDER_ID = process.env.DRIVE_FOLDER_ID
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
// Vercel stores the key with literal "\n"; turn them back into real newlines.
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

const SCOPES = ['https://www.googleapis.com/auth/drive']

export const FEED_FILE = 'feed.json'
export const STATE_FILE = 'state.json'

export function missingEnv() {
  const missing = []
  if (!FOLDER_ID) missing.push('DRIVE_FOLDER_ID')
  if (!CLIENT_EMAIL) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  if (!PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY')
  return missing
}

let _drive
function drive() {
  if (_drive) return _drive
  // google-auth-library v10 requires the options-object form; the older positional
  // JWT(email, null, key, scopes) signature throws "No key or keyFile set."
  const auth = new google.auth.JWT({ email: CLIENT_EMAIL, key: PRIVATE_KEY, scopes: SCOPES })
  _drive = google.drive({ version: 'v3', auth })
  return _drive
}

// Newest file with this name in the folder, or null.
async function findFile(name) {
  const res = await drive().files.list({
    q: `name='${name}' and '${FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 10,
    spaces: 'drive',
  })
  return res.data.files && res.data.files.length ? res.data.files[0] : null
}

// Parsed JSON contents of the named file, or `fallback` if it doesn't exist.
export async function readJson(name, fallback = null) {
  const file = await findFile(name)
  if (!file) return fallback
  const res = await drive().files.get(
    { fileId: file.id, alt: 'media' },
    { responseType: 'text' }
  )
  if (!res.data) return fallback
  return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
}

// Overwrite (or create) the named file with `data` serialized as JSON.
export async function writeJson(name, data) {
  const file = await findFile(name)
  const media = { mimeType: 'application/json', body: JSON.stringify(data, null, 2) }
  if (file) {
    await drive().files.update({ fileId: file.id, media })
  } else {
    await drive().files.create({
      requestBody: { name, parents: [FOLDER_ID], mimeType: 'application/json' },
      media,
    })
  }
}

// Read state.json, apply `mutate(state)` in place, write it back, return the new state.
// Single-user → a plain read-modify-write is safe (the website is the only writer).
export async function mutateState(mutate) {
  const state = (await readJson(STATE_FILE, {})) || {}
  if (!state.done) state.done = {}
  if (!state.links) state.links = {}
  if (!state.notes) state.notes = {}
  mutate(state)
  await writeJson(STATE_FILE, state)
  return state
}

// Tiny helpers shared by the route handlers.
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
