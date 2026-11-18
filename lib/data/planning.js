import { supabase } from '@/utils/supabase/client'

export async function fetchPlanningTasks(projectId) {
  const { data, error } = await supabase
    .from('planning_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('ordre', { ascending: true })
    .order('date_debut', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createPlanningTask(fields) {
  const { data, error } = await supabase.from('planning_tasks').insert([fields]).select('*').single()
  if (error) throw error
  return data
}

export async function updatePlanningTask(id, fields) {
  const { data, error } = await supabase.from('planning_tasks').update(fields).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deletePlanningTask(id) {
  const { error } = await supabase.from('planning_tasks').delete().eq('id', id)
  if (error) throw error
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
