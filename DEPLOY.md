# DEPLOY.md — Vercel

The repo is deploy-ready: Vite frontend + `api/` serverless functions + **Airtable** backend.
Do the Airtable setup in `SETUP_AIRTABLE.md` first (you need the token before the site can read/write).

> Already deployed? To switch an existing deployment from Drive to Airtable: in Vercel → Settings →
> Environment Variables, **add** `AIRTABLE_TOKEN` + `AIRTABLE_BASE_ID` (and you may delete the old
> `DRIVE_*` / `GOOGLE_*` vars), then redeploy (a `git push` triggers it automatically).

## A. Push to GitHub
The project is on `main`. If the remote isn't set yet:
```bash
git remote add origin https://github.com/<you>/ae-design-tracker.git
git push -u origin main
```

## B. Import into Vercel
1. [vercel.com/new](https://vercel.com/new) → **Add New… → Project** → **Import** `ae-design-tracker`.
2. Vercel auto-detects:
   - **Framework Preset: Vite** (leave it)
   - **Build** `vite build` · **Output** `dist` · **Install** `npm install` (all auto)
   - The **`api/` folder** is detected as Node Serverless Functions automatically.
3. Expand **Environment Variables** and add the two from `SETUP_AIRTABLE.md`:

   | Key | Value |
   |---|---|
   | `AIRTABLE_TOKEN` | your `pat…` Personal Access Token (read+write on the base) |
   | `AIRTABLE_BASE_ID` | `appNdq7AL0ebUvYBP` |

   Leave **Production, Preview, Development** all checked.
4. **Deploy** → `https://ae-design-tracker.vercel.app`.

> Alternative (no GitHub): `npm i -g vercel`, then `vercel`, add the two env vars with
> `vercel env add`, then `vercel --prod`.

## C. Post-deploy checklist
- [ ] `https://<url>/api/state` returns JSON (not an error). `{"error":"missing_env"}` → an env var
      is unset; `{"error":"airtable_read_failed"}` → the token lacks access to the base, or its scopes
      are missing `data.records:read/write`.
- [ ] Open the URL → Daily Due renders with the M0 tasks from Airtable.
- [ ] Tick a task → reload → it persisted (PATCHed the Tasks record's `Done` in Airtable).
- [ ] Add a Figma link + a note → reload → both persisted (Links / Notes tables).
- [ ] Phone: centered, dark theme matches the address bar (`theme-color #1F1E1C`), taps work.
- [ ] Roadmap → M0 "You are here", week focus, projected finish all show.

## D. After it's live
Return to your Cowork session and say **"wire the scheduled tasks to Airtable"** so the Daily Due +
Weekly Roadmap jobs write the base via the Airtable connector (upsert Tasks/Meta daily, Roadmap/Meta
weekly). Reads happen at request time, so those updates appear on the site within seconds, no redeploy.
