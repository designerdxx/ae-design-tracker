// GET /api/health — TEMPORARY diagnostic. Reports whether the env vars are present and
// well-formed, whether the service account can authenticate, and whether it can see the
// Drive folder. Never returns the private key value (only metadata about it).
// Safe to delete once the backend is confirmed healthy.

import { google } from 'googleapis'
import { sendJson } from './_drive.js'

export default async function handler(req, res) {
  const folder = process.env.DRIVE_FOLDER_ID || ''
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || ''
  const key = rawKey.replace(/\\n/g, '\n')

  const report = {
    env: {
      DRIVE_FOLDER_ID: { present: !!folder, length: folder.length },
      GOOGLE_SERVICE_ACCOUNT_EMAIL: { present: !!email, value: email }, // shareable, not secret
      GOOGLE_PRIVATE_KEY: {
        present: !!rawKey,
        length: rawKey.length,
        hadLiteralBackslashN: /\\n/.test(rawKey),
        hasRealNewlinesAfterFix: /\n/.test(key),
        startsWithBEGIN: key.trim().startsWith('-----BEGIN'),
        endsWithENDKEY: key.trim().endsWith('PRIVATE KEY-----'),
        looksWrappedInQuotes: /^["']/.test(rawKey.trim()),
      },
    },
    auth: null,
    drive: null,
  }

  try {
    const jwt = new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/drive'])
    const tokens = await jwt.authorize()
    report.auth = { ok: true, gotAccessToken: !!(tokens && tokens.access_token) }
    try {
      const drive = google.drive({ version: 'v3', auth: jwt })
      const r = await drive.files.list({
        q: `'${folder}' in parents and trashed=false`,
        fields: 'files(id,name,modifiedTime)',
        pageSize: 10,
        spaces: 'drive',
      })
      const files = r.data.files || []
      report.drive = { ok: true, fileCount: files.length, files: files.map(f => f.name) }
    } catch (e) {
      report.drive = { ok: false, error: String((e && e.message) || e) }
    }
  } catch (e) {
    report.auth = { ok: false, error: String((e && e.message) || e) }
  }

  sendJson(res, 200, report)
}
