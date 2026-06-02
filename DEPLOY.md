# DEPLOY.md — Vercel (Phase 3)

The repo is deploy-ready: Vite frontend + `api/` serverless functions + Google Drive backend.
Do the Drive setup in `SETUP_DRIVE.md` first (you need the 3 env values before the site can read/write).

## A. Push to GitHub
The project is committed locally on `main`. Create an empty GitHub repo (no README), then:

```bash
git remote add origin https://github.com/<you>/ae-design-tracker.git
git push -u origin main
```

## B. Import into Vercel (recommended path)
1. [vercel.com/new](https://vercel.com/new) → **Add New… → Project**.
2. **Import** the `ae-design-tracker` GitHub repo.
3. Vercel auto-detects:
   - **Framework Preset: Vite** (leave it)
   - **Build Command:** `vite build` · **Output Directory:** `dist` · **Install:** `npm install` (all auto)
   - The **`api/` folder** is detected as Node Serverless Functions automatically (nothing to configure).
4. Expand **Environment Variables** and add the three from `SETUP_DRIVE.md`:

   | Key | Value |
   |---|---|
   | `DRIVE_FOLDER_ID` | the Drive folder ID |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key |
   | `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON — paste **exactly** as it appears (one line with `\n` sequences). No surrounding quotes in the Vercel UI. |

   Leave the environment as **Production, Preview, Development** (all checked).
5. **Deploy.** You get a URL like `https://ae-design-tracker.vercel.app`.

> Alternative (no GitHub): `npm i -g vercel`, then `vercel` (link/create project), add the 3 env vars
> with `vercel env add`, then `vercel --prod`.

## C. Post-deploy checklist
- [ ] Open the `*.vercel.app` URL → the Daily Due card renders (clay accent, Inter).
- [ ] `https://<url>/api/state` returns JSON (not an error). If it shows `{"error":"missing_env"}`,
      an env var is unset; `{"error":"drive_read_failed"}` usually means the folder wasn't shared
      with the service-account email (Editor).
- [ ] Tick a task → reload → it persisted (written to `state.json` in Drive).
- [ ] Add a Figma link + a note → reload → both persisted.
- [ ] Open on your phone: the layout is centered and readable, the dark theme matches the address bar
      (`theme-color #1F1E1C`), tap targets work. (`viewport-fit=cover` + `theme-color` are already set.)
- [ ] Switch to Roadmap → M0 "You are here", week focus, projected finish all show.

## D. After it's live
Return to your Cowork session and say **"wire the scheduled tasks to Drive"** so the Daily Due +
Weekly Roadmap jobs start writing `feed.json` into the Drive folder (see `docs/COWORK_JOBS.md` in the
handoff package). Until then the site shows whatever `feed.json` currently holds (or its local cache).
Because reads happen at request time, new briefs appear within seconds, no redeploy.
