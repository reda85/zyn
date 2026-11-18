import { supabase } from '@/utils/supabase/client'
import { fetchAll } from './fetchAll'

// Annuaire des entreprises de l'organisation (titulaires des lots).
export const ENTREPRISE_COLUMNS = 'id,organization_id,name,corps_etat,contact_name,phone,email,created_at'

export async function fetchEntreprises(organizationId) {
  const { data, error } = await supabase
    .from('entreprises')
    .select(ENTREPRISE_COLUMNS)
    .eq('organization_id', organizationId)
  if (error) throw error
  // Tri côté client : l'ordre SQL place « Électro… » après « Z… ».
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}

export async function createEntreprise(organizationId, fields) {
  const { data, error } = await supabase
    .from('entreprises')
    .insert([{ organization_id: organizationId, ...clean(fields) }])
    .select(ENTREPRISE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateEntreprise(id, fields) {
  const { data, error } = await supabase
    .from('entreprises')
    .update(clean(fields))
    .eq('id', id)
    .select(ENTREPRISE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteEntreprise(id) {
  const { error } = await supabase.from('entreprises').delete().eq('id', id)
  if (error) throw error
}

// Chaînes vides → null, pour ne pas stocker de champs « remplis » à blanc.
function clean(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'id' || k === 'organization_id' || k === 'created_at') continue
    out[k] = typeof v === 'string' ? v.trim() || null : v
  }
  return out
}

/** Les lots d'un projet, avec le nom de leur entreprise. */
export async function fetchLots(projectId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*, entreprises(id,name,corps_etat)')
    .eq('project_id', projectId)
    .order('order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateLot(id, fields) {
  const { error } = await supabase.from('categories').update(fields).eq('id', id)
  if (error) throw error
}

/** Un lot est en retard quand sa fin prévue est passée sans qu'il soit terminé. */
export function isLotLate(lot, today = todayISO()) {
  return Boolean(lot.date_fin_prevue && lot.date_fin_prevue < today && !lot.date_fin_reelle && (lot.avancement ?? 0) < 100)
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** « 12 janv. » ou « 12 janv. 2027 » si l'année diffère de l'année en cours. */
export function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function fmtPeriod(start, end) {
  if (!start && !end) return null
  if (start && end) return `${fmtDate(start)} → ${fmtDate(end)}`
  return start ? `À partir du ${fmtDate(start)}` : `Jusqu’au ${fmtDate(end)}`
}

/** Statistiques de réserves par lot, sur le même principe que la vue d'ensemble :
 *  une réserve est levée quand elle porte le dernier statut du projet. */
export function lotStats(pins, statuses) {
  const ordered = [...statuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const finalId = ordered[ordered.length - 1]?.id
  const now = Date.now()
  const byLot = {}
  for (const p of pins) {
    const key = p.category_id ?? 'none'
    const s = (byLot[key] ??= {
      total: 0, open: 0, closed: 0, overdue: 0,
      statuses: ordered.map((st) => ({ ...st, count: 0 })),
    })
    s.total++
    const st = s.statuses.find((x) => x.id === p.status_id)
    if (st) st.count++
    if (p.status_id && p.status_id === finalId) s.closed++
    else {
      s.open++
      if (p.due_date && Date.parse(p.due_date) < now) s.overdue++
    }
  }
  return byLot
}

export function fetchLotPins(projectId) {
  return fetchAll(() =>
    supabase
      .from('pdf_pins')
      .select('id,category_id,status_id,due_date')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('isArchived', 'is', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
  )
}
