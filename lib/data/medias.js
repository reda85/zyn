import dayjs from 'dayjs'
import { supabase } from '@/utils/supabase/client'

export const MEDIAS_PAGE_SIZE = 60

/**
 * Une page de la médiathèque d'un projet, filtrée côté serveur.
 * @param filters { planId, from, to } — dates au format AAAA-MM-JJ, bornes incluses
 * @param scope   { profileId, isGuest }
 */
export async function fetchMediasPage({ projectId, filters, scope, cursor }) {
  // Filtrer sur le pin (plan, invité) impose une jointure interne.
  const needsPin = Boolean(filters.planId) || scope.isGuest
  const pinEmbed = `pdf_pins${needsPin ? '!inner' : ''}(id,name,plan_id,assigned_to(id,name))`

  let q = supabase
    .from('pins_photos')
    .select(`id,created_at,public_url,thumb_url,pin_id,project_id,${pinEmbed}`, cursor ? undefined : { count: 'exact' })
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (filters.planId) q = q.eq('pdf_pins.plan_id', filters.planId)
  if (scope.isGuest) q = q.eq('pdf_pins.assigned_to', scope.profileId)
  if (filters.from) q = q.gte('created_at', dayjs(filters.from).startOf('day').toISOString())
  if (filters.to) q = q.lt('created_at', dayjs(filters.to).add(1, 'day').startOf('day').toISOString())

  if (cursor) {
    q = q.or(
      `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.lt.${cursor.id})`
    )
  }

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MEDIAS_PAGE_SIZE)

  if (error) throw error

  const rows = data ?? []
  const last = rows[rows.length - 1]
  return {
    rows,
    count: cursor ? null : count ?? rows.length,
    nextCursor:
      rows.length === MEDIAS_PAGE_SIZE && last ? { created_at: last.created_at, id: last.id } : null,
  }
}
