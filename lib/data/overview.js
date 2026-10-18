import { supabase } from '@/utils/supabase/client'
import { fetchAll } from './fetchAll'

const DAY = 24 * 60 * 60 * 1000

/**
 * Vue d'ensemble de l'écran Projets : une seule lecture des pins (colonnes
 * minimales) et des statuts des projets visibles, agrégée en mémoire.
 *
 * Un pin est « levé » quand il porte le dernier statut de son projet (le statut
 * de fin de cycle, fixe). La date de levée retenue est sa dernière mise à jour.
 */
export async function fetchOverview(projectIds) {
  if (!projectIds.length) return emptyOverview()

  const since7 = new Date(Date.now() - 7 * DAY).toISOString()
  const [pins, { data: statuses, error: stErr }, { count: photos7, error: phErr }] = await Promise.all([
    fetchAll(() =>
      supabase
        .from('pdf_pins')
        .select('id,project_id,status_id,due_date,created_at,updated_at')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .not('isArchived', 'is', true)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
    ),
    supabase.from('Status').select('id,project_id,name,color,order').in('project_id', projectIds),
    supabase
      .from('pins_photos')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .is('deleted_at', null)
      .gte('created_at', since7),
  ])
  if (stErr) throw stErr
  if (phErr) throw phErr
  return aggregate(projectIds, pins, statuses ?? [], photos7 ?? 0)
}

function emptyOverview() {
  return { open: 0, overdue: 0, closed30: 0, created30: 0, photos7: 0, weeks: [], byProject: {} }
}

export function aggregate(projectIds, pins, statuses, photos7) {
  const now = Date.now()
  const finalByProject = {}
  const ordered = {}
  for (const s of statuses) {
    ;(ordered[s.project_id] ??= []).push(s)
  }
  for (const [pid, list] of Object.entries(ordered)) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    finalByProject[pid] = list[list.length - 1]?.id
  }

  // 12 semaines glissantes, la plus ancienne en premier.
  const weekStart = startOfWeek(now)
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    start: weekStart - (11 - i) * 7 * DAY,
    created: 0,
    closed: 0,
  }))
  const weekIndex = (t) => {
    const i = 11 - Math.floor((weekStart - startOfWeek(t)) / (7 * DAY))
    return i >= 0 && i < 12 ? i : -1
  }

  const byProject = Object.fromEntries(
    projectIds.map((id) => [
      id,
      { total: 0, open: 0, overdue: 0, closed: 0, statuses: (ordered[id] ?? []).map((s) => ({ ...s, count: 0 })), lastActivity: null },
    ])
  )
  let open = 0, overdue = 0, closed30 = 0, created30 = 0

  for (const p of pins) {
    const proj = byProject[p.project_id]
    if (!proj) continue
    const created = Date.parse(p.created_at)
    const updated = Date.parse(p.updated_at || p.created_at)
    const isClosed = p.status_id && p.status_id === finalByProject[p.project_id]

    proj.total++
    const st = proj.statuses.find((s) => s.id === p.status_id)
    if (st) st.count++
    if (!proj.lastActivity || updated > proj.lastActivity) proj.lastActivity = updated

    const wc = weekIndex(created)
    if (wc >= 0) weeks[wc].created++
    if (now - created <= 30 * DAY) created30++

    if (isClosed) {
      proj.closed++
      const wd = weekIndex(updated)
      if (wd >= 0) weeks[wd].closed++
      if (now - updated <= 30 * DAY) closed30++
    } else {
      proj.open++
      open++
      if (p.due_date && Date.parse(p.due_date) < now) {
        proj.overdue++
        overdue++
      }
    }
  }
  // Un pin sans statut compte dans le total mais pas dans la barre de statuts.
  return { open, overdue, closed30, created30, photos7, weeks, byProject }
}

function startOfWeek(t) {
  const d = new Date(t)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setHours(0, 0, 0, 0)
  return d.getTime() - day * DAY
}
