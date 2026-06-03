# SETUP_AIRTABLE.md — Airtable backend

The website reads and writes one Airtable base via the REST API, using a Personal Access
Token (PAT). Only the `/api/*` functions touch Airtable; the browser never sees the token.

The base `appNdq7AL0ebUvYBP` ("AskEdgar Tracker") is already built and seeded with six tables
(Tasks, Roadmap, Meta, Links, Notes, Backlog) — don't recreate it. See `docs/AIRTABLE.md` for
the field contract and endpoint mapping.

You need two values for Vercel:

## 1. Create a Personal Access Token
1. Go to **[airtable.com/create/tokens](https://airtable.com/create/tokens)**.
2. **Name** it e.g. `askedgar-tracker-web`.
3. **Scopes** → add `data.records:read` and `data.records:write`.
4. **Access** → add the base **AskEdgar Tracker** (`appNdq7AL0ebUvYBP`).
5. **Create token** → copy it (starts with `pat...`). You won't see it again.

## 2. Set the two values
**On Vercel** (Project → Settings → Environment Variables), for Production/Preview/Development:

| Name | Value |
|---|---|
| `AIRTABLE_TOKEN` | the `pat…` token from step 1 |
| `AIRTABLE_BASE_ID` | `appNdq7AL0ebUvYBP` |

**Locally** (optional, for `vercel dev`): copy `.env.example` to `.env.local` and fill the token.
`.env*` is gitignored; only `.env.example` is committed.

Then redeploy. Until the token is set, `/api/state` returns `missing_env` and the UI falls back
to its local cache, so it never hard-crashes.

## Notes
- Each tick PATCHes a single Tasks record (~tens of ms) instead of rewriting a whole file.
- Reads happen at request time, so Cowork updates to the base appear within seconds, no redeploy.
- After deploy, wire the Cowork jobs by saying **"wire the scheduled tasks to Airtable"** in the
  Cowork session (they upsert Tasks/Meta daily and Roadmap/Meta weekly via the Airtable connector).
