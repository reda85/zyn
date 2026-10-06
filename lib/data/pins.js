import { supabase } from '@/utils/supabase/client'
import { fetchAll } from './fetchAll'
import { applyPinFilters } from './pinFilters'

export const PINS_PAGE_SIZE = 50

// ── Une seule forme de pin pour toute l'application ───────────────────────────
// Listes, tiroir, canvas et insertions renvoient exactement ces colonnes : un
// pin tout juste créé a la même forme qu'un pin chargé.
const PIN_COLUMNS = [
  'id', 'created_at', 'updated_at', 'name', 'note', 'x', 'y', 'isArchived',
  'created_by', 'status_id', 'category_id', 'due_date', 'pin_number', 'pdf_name',
  'project_id', 'plan_id',
  'assigned_to(id,name,email,auth_id)',
  'categories(name)',
  'projects(id,name,project_number,organization_id)',
  'plans(id,name,file_url)',
  'pin_tags(tag_id,tags(*))',
].join(',')

// Vignettes de la liste latérale du plan : identifiants et URL seulement.
const PIN_PHOTOS = 'pins_photos(id,public_url,thumb_url,deleted_at)'

// Alias dédié au filtre par tag : filtrer directement `pin_tags` tronquerait
// la liste des tags affichés sur chaque pin.
const TAG_FILTER = 'tag_filter:pin_tags!inner(tag_id)'

export function pinSelect({ withPhotos = false, filterByTag = false } = {}) {
  return [PIN_COLUMNS, withPhotos && PIN_PHOTOS, filterByTag && TAG_FILTER].filter(Boolean).join(',')
}

const withoutDeletedPhotos = (pin) =>
  pin?.pins_photos ? { ...pin, pins_photos: pin.pins_photos.filter((p) => !p.deleted_at) } : pin

const stripTagFilter = ({ tag_filter, ...pin }) => pin

// ── Lectures ──────────────────────────────────────────────────────────────────

/** Tous les pins d'un plan (la carte a besoin de l'ensemble). */
export async function fetchPlanPins({ planId, scope }) {
  const rows = await fetchAll(() => {
    let q = supabase
      .from('pdf_pins')
      .select(pinSelect({ withPhotos: true }))
      .eq('plan_id', planId)
      .is('deleted_at', null)
    if (scope.isGuest) q = q.eq('assigned_to', scope.profileId)
    return q.order('created_at', { ascending: true }).order('id', { ascending: true })
  })
  return rows.map(withoutDeletedPhotos)
}

function projectPinsQuery({ projectId, filters, scope, select, options }) {
  const q = supabase
    .from('pdf_pins')
    .select(select, options)
    .eq('project_id', projectId)
    .is('deleted_at', null)
  return applyPinFilters(q, filters, scope)
}

/**
 * Une page de la liste des tâches. Pagination par curseur (created_at, id) :
 * stable même si des tâches sont créées pendant qu'on fait défiler.
 * Le total n'est demandé qu'avec la première page.
 */
export async function fetchProjectPinsPage({ projectId, filters, scope, cursor }) {
  let q = projectPinsQuery({
    projectId,
    filters,
    scope,
    select: pinSelect({ filterByTag: filters.tags.length > 0 }),
    options: cursor ? undefined : { count: 'exact' },
  })

  if (cursor) {
    q = q.or(
      `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.lt.${cursor.id})`
    )
  }

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PINS_PAGE_SIZE)

  if (error) throw error

  const rows = (data ?? []).map(stripTagFilter)
  const last = rows[rows.length - 1]
  return {
    rows,
    count: cursor ? null : count ?? rows.length,
    nextCursor:
      rows.length === PINS_PAGE_SIZE && last ? { created_at: last.created_at, id: last.id } : null,
  }
}

/** Identifiants de toutes les tâches correspondant aux filtres (« tout sélectionner »). */
export async function fetchProjectPinIds({ projectId, filters, scope }) {
  const select = filters.tags.length > 0 ? `id,${TAG_FILTER}` : 'id'
  const rows = await fetchAll(() =>
    projectPinsQuery({ projectId, filters, scope, select })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
  )
  return rows.map((r) => r.id)
}

/** Lignes complètes (avec photos) pour un ensemble d'identifiants : exports. */
export async function fetchPinsByIds(ids, { withPhotos = false } = {}) {
  const rows = []
  // Par lots : une liste d'UUID trop longue dépasserait la taille d'URL admise.
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from('pdf_pins')
      .select(pinSelect({ withPhotos }))
      .in('id', ids.slice(i, i + 100))
      .is('deleted_at', null)
    if (error) throw error
    rows.push(...(data ?? []).map(withoutDeletedPhotos))
  }
  const position = new Map(ids.map((id, i) => [id, i]))
  return rows.sort((a, b) => position.get(a.id) - position.get(b.id))
}

export async function fetchPin(pinId) {
  const { data, error } = await supabase
    .from('pdf_pins')
    .select(pinSelect({ withPhotos: true }))
    .eq('id', pinId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return withoutDeletedPhotos(data)
}

// ── Écritures ─────────────────────────────────────────────────────────────────

export async function insertPin(values) {
  const { data, error } = await supabase
    .from('pdf_pins')
    .insert(values)
    .select(pinSelect({ withPhotos: true }))
    .single()
  if (error) throw error
  return data
}

export async function updatePin(pinId, values, { touchedBy } = {}) {
  const payload = touchedBy
    ? { ...values, updated_by: touchedBy, updated_at: new Date().toISOString() }
    : values
  const { data, error } = await supabase
    .from('pdf_pins')
    .update(payload)
    .eq('id', pinId)
    .select(pinSelect({ withPhotos: true }))
    .single()
  if (error) throw error
  return withoutDeletedPhotos(data)
}
