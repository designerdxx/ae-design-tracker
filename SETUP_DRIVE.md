# SETUP_DRIVE.md — Google Drive backend (beginner walkthrough)

The website reads and writes two JSON files in one Google Drive folder, logging in as a
**service account** (a robot Google account). Free, no credit card. You finish with three
values to paste into Vercel: `DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_PRIVATE_KEY`.

The two files:
- **`feed.json`** — written ONLY by the Cowork jobs (today's tasks, the roadmap, meta).
- **`state.json`** — written ONLY by this website (your ticks, links, notes). Created on first write.

Because the two sides never write the same file, edits can't clobber each other.

---

## 1. Make the Drive folder
1. [drive.google.com](https://drive.google.com) → **+ New → New folder** → name it `AskEdgar Tracker` → Create.
2. Open it. The URL ends in `/folders/XXXX` — that `XXXX` is your **DRIVE_FOLDER_ID**. Save it.

## 2. Create a Google Cloud project
1. [console.cloud.google.com](https://console.cloud.google.com) → sign in with the same Google account. No billing needed.
2. Project dropdown (top) → **New Project** → name `askedgar-tracker` → Create → select it.

## 3. Enable the Drive API
1. Top search → **"Google Drive API"** → open → **Enable**.

## 4. Create the service account
1. Top search → **"Service Accounts"** → **+ Create Service Account**.
2. Name `askedgar-tracker` → **Create and Continue** → skip roles → **Continue → Done**.
3. Copy its **email** (like `askedgar-tracker@askedgar-tracker.iam.gserviceaccount.com`).
   That's **GOOGLE_SERVICE_ACCOUNT_EMAIL**.

## 5. Make its key file
1. Click the service account → **Keys** tab → **Add Key → Create new key → JSON → Create**.
2. A `.json` file downloads. **Keep it private — never commit it.** Inside it:
   - `client_email` → confirms `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → that's **GOOGLE_PRIVATE_KEY** (a long `-----BEGIN PRIVATE KEY-----...` block).

## 6. Share the folder with the robot
1. [drive.google.com](https://drive.google.com) → right-click `AskEdgar Tracker` → **Share**.
2. Paste the service-account email → role **Editor** → untick Notify → **Share**.

> Without this share step the functions return `403`/`drive_read_failed` — the robot can't see the folder.

---

## 7. Set the three values

**On Vercel** (Project → Settings → Environment Variables), add all three:

| Name | Value |
|---|---|
| `DRIVE_FOLDER_ID` | the folder ID from step 1 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON — paste it **with** its `\n` characters, wrapped in double quotes |

**Locally** (optional, for `vercel dev`): copy `.env.example` to `.env.local` and fill the same three.
`.env*` is gitignored; only `.env.example` is committed.

That's the entire backend auth. The browser never sees these — only the Vercel functions do.

---

## How it behaves
- The site **reads at request time**, so a new Cowork brief appears within seconds, no redeploy.
- `feed.json` / `state.json` are resolved **by name, newest `modifiedTime`** — if Cowork's connector
  writes a new revision instead of overwriting, the site still picks the latest.
- Until the env vars + share are in place, `/api/state` returns a clear `missing_env` / `drive_read_failed`
  error and the UI falls back to its local cache, so it never hard-crashes.

After deploy, return to your Cowork session and say **"wire the scheduled tasks to Drive"** to point
the Daily Due + Weekly Roadmap jobs at `feed.json` (see `docs/COWORK_JOBS.md` in the handoff package).
