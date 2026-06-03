# AIRTABLE.md — switch the backend from Google Drive to Airtable

**This SUPERSEDES `SPEC.md` §B–E (the Drive design).** Everything else in SPEC.md/CLAUDE.md
(features, design system, request-time reads, optimistic UI) still applies. The base is
already built and seeded — do not recreate tables; just point the app at them.

## Why
Drive stored everything as one JSON file, so each tick re-uploaded the whole file (slow).
Airtable updates a single record (~tens of ms) and gives a grid UI to eyeball/edit.

## Connection (Vercel env vars)
- `AIRTABLE_TOKEN` = the Personal Access Token (read+write on this base). Server-side only.
- `AIRTABLE_BASE_ID` = `appNdq7AL0ebUvYBP`
Call the Airtable REST API server-side from `/api/*` (Bearer token). The browser never sees the token.
REST base URL: `https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{Table}`.

## Tables & fields (names are stable; use them directly)
- **Tasks** — `Key` (=`<date>|<list>-<TaskId>`), `Date` (YYYY-MM-DD), `TaskId`, `List` (today|carry), `Title`, `DoneDefinition`, `Done` (checkbox)
- **Roadmap** — `Id` (M0..M5), `Name`, `Target`, `State` (done|active|upcoming), `Progress` (0-100), `Order`
- **Meta** — `Key`, `Value`  (keys: activeMilestone, milestoneTarget, projectedFinish, status, weekFocus)
- **Links** — `URL`, `Date`, `Label`
- **Notes** — `Date`, `Note`
- **Backlog** — `Id`, `Title`, `Problem`, `Serves`, `Effort`, `Tag` (foundational|future)

(Table IDs, if you prefer them: Tasks tblQ1BgKM32KPoeFU, Roadmap tblGOd3yBRn18w9Pf,
Meta tbl1x7rIsQMpHJjsf, Links tblSV9wnNVwNrv7Bm, Notes tbly2gk0jrMY4TtBD, Backlog tblqnn3l94Pfg1wsp.)

## Endpoint mapping (keep the same response shapes the UI already uses)
- `GET /api/state?date=D`:
  - Meta → object `{activeMilestone, milestoneTarget, projectedFinish, status, weekFocus}`.
  - Roadmap → list, sort by `Order` → `roadmap[]`.
  - Tasks where `Date = D` → `today_tasks` (List=today) and `carryover` (List=carry),
    each `{id:TaskId, title:Title, done_definition:DoneDefinition, done:Done}`.
  - Links where `Date = D` → `links[]` (URL strings).
  - Notes where `Date = D` → `notes` (first match's Note, else "").
  - `dates` = distinct `Date` values across Tasks, sorted. If no `date` param, use the max date.
  - Build the same `{meta, dates, date, day:{...}, links, notes, roadmap, view}` shape as today.
    (`view` can stay client-side localStorage; no need to persist server-side.)
- `POST /api/toggle {date,id,list,done}`:
  - Find Tasks record with `filterByFormula={Key}='<date>|<list>-<id>'` → PATCH `{Done: done}`. Single-record, fast.
- `POST /api/links {date,action,url}`:
  - add → create a Links record `{URL:url, Date:date}`; remove → find by URL+Date → DELETE.
- `POST /api/notes {date,note}`:
  - find Notes where `Date=date` → PATCH `{Note:note}`, else create.

Query tips: Airtable filtering uses `filterByFormula`, e.g. `filterByFormula={Date}='2026-06-02'`.
Records come back as `{ id, fields:{...} }`. Use `fields` for values and `id` for PATCH/DELETE URLs.
Keep optimistic UI + the localStorage cache exactly as in SPEC.md §C.

## The two Cowork jobs (handled separately, in Cowork — not this repo)
After the site is switched to Airtable and redeployed, the daily/weekly Cowork jobs will be
repointed to write Airtable via its connector (upsert Tasks/Meta daily; update Roadmap/Meta
weekly). Lee triggers this by saying "wire the scheduled tasks to Airtable" in the Cowork session.
Until then leave them writing Drive so the current site keeps working.
