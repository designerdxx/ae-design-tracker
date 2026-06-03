// POST /api/next-day — promote the latest day's incomplete tasks + the next Plan backlog
// rows into a new working day, then return that new day's view model.
//
// Idempotent / safe to double-click: every Tasks row is created only if its Key doesn't
// already exist, and each promoted Plan row is flipped to Scheduled=true so it's never
// picked twice. FigmaPrompt is read only to COPY it forward server-side; it is never returned.

import { listAll, createRecord, patchRecord, missingEnv, sendJson } from './_airtable.js'
import { planPromotion } from './_nextday.js'
import { buildState } from './_shape.js'

// Contract fields for the response read (FigmaPrompt deliberately excluded from Tasks).
const STATE = {
  Tasks: ['Key', 'Date', 'TaskId', 'List', 'Title', 'DoneDefinition', 'Done'],
  Roadmap: ['Id', 'Name', 'Target', 'State', 'Progress', 'Order'],
  Meta: ['Key', 'Value'],
  Links: ['URL', 'Date', 'Label'],
  Notes: ['Date', 'Note'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  const missing = missingEnv()
  if (missing.length) return sendJson(res, 500, { error: 'missing_env', missing })

  try {
    // Reads for the promotion logic. Tasks/Plan include FigmaPrompt purely to copy it forward.
    const [taskRecs, planRecs, metaRecs] = await Promise.all([
      listAll('Tasks', { fields: ['Key', 'Date', 'TaskId', 'List', 'Done', 'Title', 'DoneDefinition', 'FigmaPrompt'] }),
      listAll('Plan', {
        filterByFormula: 'NOT({Scheduled})',
        sort: [{ field: 'Order' }],
        fields: ['TaskId', 'Order', 'Milestone', 'Title', 'DoneDefinition', 'FigmaPrompt'],
      }),
      listAll('Meta', { fields: ['Key', 'Value'] }),
    ])

    const amRec = metaRecs.find(r => r.fields.Key === 'activeMilestone')
    const activeMilestone = (amRec && amRec.fields.Value) || ''
    const plan = planPromotion({ taskRecs, planRecs, activeMilestone }, 4)

    if (!plan.next) return sendJson(res, 400, { error: 'no_tasks' })

    // Apply writes (creates are pre-filtered to non-existing Keys, so this is idempotent).
    for (const fields of [...plan.carryRows, ...plan.newRows]) await createRecord('Tasks', fields)
    for (const id of plan.scheduleIds) await patchRecord('Plan', id, { Scheduled: true })
    if (plan.milestone) {
      if (amRec) await patchRecord('Meta', amRec.id, { Value: plan.milestone })
      else await createRecord('Meta', { Key: 'activeMilestone', Value: plan.milestone })
    }

    // Re-read with the contract fields (no FigmaPrompt) and return the new day's data.
    const [meta, roadmap, tasks, links, notes] = await Promise.all([
      listAll('Meta', { fields: STATE.Meta }),
      listAll('Roadmap', { sort: [{ field: 'Order' }], fields: STATE.Roadmap }),
      listAll('Tasks', { fields: STATE.Tasks }),
      listAll('Links', { fields: STATE.Links }),
      listAll('Notes', { fields: STATE.Notes }),
    ])
    sendJson(res, 200, {
      ...buildState({ meta, roadmap, tasks, links, notes }, plan.next),
      promoted: { from: plan.latest, to: plan.next, carriedOver: plan.carryRows.length, added: plan.newRows.length },
    })
  } catch (err) {
    sendJson(res, 502, { error: 'next_day_failed', message: String((err && err.message) || err) })
  }
}
