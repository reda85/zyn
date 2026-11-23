import { supabase } from '@/utils/supabase/client'

// Le planning réunit deux sources :
//  · les tâches planifiées = tâches de l'application (pdf_pins) avec une date de
//    début ; leur fin est l'échéance de la tâche ;
//  · les jalons (planning_tasks).
// Chaque élément est ramené à une forme commune :
//   { id, kind: 'pin' | 'jalon', type: 'tache' | 'jalon', libelle, lot_id,
//     sous_lot_id, date_debut, date_fin, avancement, done, pin_number, status_id }
// Une tâche peut être rangée dans un sous-lot de son lot (sous_lots).

const PIN_COLUMNS = 'id,name,category_id,sous_lot_id,status_id,date_debut,due_date,avancement,assigned_to,pin_number'

/** Échéance (timestamptz) → jour calendaire local, comme l'affiche la liste des tâches. */
export function dueToDay(due) {
  if (!due) return null
  const d = new Date(due)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Jour → échéance enregistrée à midi UTC (le même jour sous tous les fuseaux du projet). */
export const dayToDue = (iso) => (iso ? `${iso}T12:00:00Z` : null)

export function finalStatusId(statuses) {
  return [...(statuses ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).at(-1)?.id ?? null
}

export function pinToItem(pin, finalId) {
  const done = Boolean(finalId && pin.status_id === finalId)
  const debut = pin.date_debut
  const fin = dueToDay(pin.due_date)
  return {
    id: pin.id,
    kind: 'pin',
    type: 'tache',
    libelle: pin.name || 'Tâche sans nom',
    lot_id: pin.category_id,
    sous_lot_id: pin.sous_lot_id ?? null,
    date_debut: debut,
    date_fin: fin && fin >= debut ? fin : debut,
    avancement: done ? 100 : pin.avancement ?? 0,
    done,
    pin_number: pin.pin_number,
    status_id: pin.status_id,
  }
}

export async function fetchPlanning(projectId, statuses) {
  const [pins, jalons] = await Promise.all([
    supabase
      .from('pdf_pins')
      .select(PIN_COLUMNS)
      .eq('project_id', projectId)
      .not('date_debut', 'is', null)
      .is('deleted_at', null)
      .not('isArchived', 'is', true)
      .order('date_debut', { ascending: true }),
    supabase
      .from('planning_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('date_debut', { ascending: true }),
  ])
  if (pins.error) throw pins.error
  if (jalons.error) throw jalons.error
  const finalId = finalStatusId(statuses)
  return [
    ...(jalons.data ?? []).map((j) => ({ ...j, kind: 'jalon', done: j.avancement >= 100 })),
    ...(pins.data ?? []).map((p) => pinToItem(p, finalId)),
  ]
}

/**
 * Champs d'une tâche du planning → colonnes de pdf_pins. À 100 %, la tâche
 * prend le dernier statut du projet (levée) pour apparaître terminée partout.
 */
function pinFields(fields, statuses) {
  const out = {}
  if ('libelle' in fields) out.name = fields.libelle
  if ('lot_id' in fields) out.category_id = fields.lot_id
  if ('sous_lot_id' in fields) out.sous_lot_id = fields.sous_lot_id || null
  if ('date_debut' in fields) out.date_debut = fields.date_debut
  if ('date_fin' in fields) out.due_date = dayToDue(fields.date_fin)
  if ('avancement' in fields) {
    out.avancement = fields.avancement
    if (fields.avancement >= 100) out.status_id = finalStatusId(statuses)
  }
  return out
}

export async function createPlanningItem(fields, { projectId, statuses, defaultLotId }) {
  if (fields.type === 'jalon') {
    const { data, error } = await supabase
      .from('planning_tasks')
      .insert([{ project_id: projectId, type: 'jalon', libelle: fields.libelle, lot_id: fields.lot_id, date_debut: fields.date_debut, date_fin: fields.date_debut, avancement: fields.avancement ?? 0 }])
      .select('*')
      .single()
    if (error) throw error
    return { ...data, kind: 'jalon', done: data.avancement >= 100 }
  }
  const ordered = [...(statuses ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const { data, error } = await supabase
    .from('pdf_pins')
    .insert([{
      project_id: projectId,
      type: 'tache',
      status_id: ordered[0]?.id ?? null,
      ...pinFields({ ...fields, lot_id: fields.lot_id ?? defaultLotId }, statuses),
    }])
    .select(PIN_COLUMNS)
    .single()
  if (error) throw error
  return pinToItem(data, finalStatusId(statuses))
}

export async function updatePlanningItem(item, fields, { statuses, defaultLotId }) {
  if (item.kind === 'jalon') {
    const jf = { ...fields }
    delete jf.type
    if ('date_debut' in jf) jf.date_fin = jf.date_debut
    const { data, error } = await supabase.from('planning_tasks').update(jf).eq('id', item.id).select('*').single()
    if (error) throw error
    return { ...data, kind: 'jalon', done: data.avancement >= 100 }
  }
  const pf = pinFields({ ...fields, ...('lot_id' in fields ? { lot_id: fields.lot_id ?? defaultLotId } : {}) }, statuses)
  const { data, error } = await supabase
    .from('pdf_pins')
    .update({ ...pf, updated_at: new Date().toISOString() })
    .eq('id', item.id)
    .select(PIN_COLUMNS)
    .single()
  if (error) throw error
  return pinToItem(data, finalStatusId(statuses))
}

/** Jalon : supprimé. Tâche : retirée du planning (elle reste dans « Tâches »). */
export async function removePlanningItem(item) {
  const { error } = item.kind === 'jalon'
    ? await supabase.from('planning_tasks').delete().eq('id', item.id)
    : await supabase.from('pdf_pins').update({ date_debut: null, updated_at: new Date().toISOString() }).eq('id', item.id)
  if (error) throw error
}

// ── Sous-lots ─────────────────────────────────────────────────────────────────

const SOUS_LOT_COLUMNS = 'id,project_id,lot_id,name,sort_order'

export async function fetchSousLots(projectId) {
  const { data, error } = await supabase
    .from('sous_lots')
    .select(SOUS_LOT_COLUMNS)
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createSousLot({ projectId, lotId, name, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from('sous_lots')
    .insert([{ project_id: projectId, lot_id: lotId, name: name.trim(), sort_order: sortOrder }])
    .select(SOUS_LOT_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function renameSousLot(id, name) {
  const { error } = await supabase.from('sous_lots').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

/** Supprime le sous-lot ; ses tâches restent dans le lot. */
export async function deleteSousLot(id) {
  const { error } = await supabase.from('sous_lots').delete().eq('id', id)
  if (error) throw error
}

/** Ordre des sous-lots d'un lot : la position dans la liste devient sort_order. */
export async function reorderSousLots(list) {
  const results = await Promise.all(list.map((s, i) => supabase.from('sous_lots').update({ sort_order: i }).eq('id', s.id)))
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
}

/**
 * Synthèse d'un sous-lot à partir de ses tâches : du premier début à la
 * dernière fin, avancement pondéré par la durée de chaque tâche.
 */
export function summarizeTasks(tasks) {
  const list = tasks.filter((t) => t.type === 'tache' && t.date_debut && t.date_fin)
  if (!list.length) return null
  let weight = 0
  let sum = 0
  let debut = list[0].date_debut
  let fin = list[0].date_fin
  for (const t of list) {
    const w = daysBetween(t.date_debut, t.date_fin) + 1
    weight += w
    sum += w * (t.avancement ?? 0)
    if (t.date_debut < debut) debut = t.date_debut
    if (t.date_fin > fin) fin = t.date_fin
  }
  return { debut, fin, avancement: Math.round(sum / weight) }
}

/** Dates prévues d'un lot (ouvert aux éditeurs du projet, pas seulement aux admins). */
export async function planLot(lotId, debut, fin) {
  const { error } = await supabase.rpc('planifier_lot', { p_lot_id: lotId, p_debut: debut || null, p_fin: fin || null })
  if (error) throw error
}

// ── Dates (jours calendaires, sans fuseau) ────────────────────────────────────

const DAY = 86400000
export const toDay = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY)
export const fromDay = (n) => new Date(n * DAY).toISOString().slice(0, 10)
export const addDays = (iso, n) => fromDay(toDay(iso) + n)
export const daysBetween = (a, b) => toDay(b) - toDay(a)

export function isTaskLate(task, today) {
  return task.date_fin < today && (task.avancement ?? 0) < 100
}

/** Lundi de la semaine ISO de `iso`. */
export function mondayOf(iso) {
  const d = toDay(iso)
  const weekday = (new Date(d * DAY).getUTCDay() + 6) % 7 // 0 = lundi
  return fromDay(d - weekday)
}

export function isoWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d - firstThursday) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}
