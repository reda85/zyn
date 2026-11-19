// Notifications du membre connecté (table notifications, remplie par la base).
import { supabase } from '@/utils/supabase/client'

export const NOTIFICATION_KINDS = {
  assigned: { label: 'Assignation' },
  status: { label: 'Statut' },
  comment: { label: 'Commentaire' },
  photo: { label: 'Photo' },
  due_soon: { label: 'Échéance' },
  overdue: { label: 'Retard' },
  meeting: { label: 'Réunion' },
  document: { label: 'Document' },
  report: { label: 'Rapport' },
}

export async function fetchNotifications({ limit = 60 } = {}) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,kind,title,body,pin_id,project_id,target,created_at,read_at,actor:actor_id(name),project:project_id(organization_id)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markNotificationsRead(ids) {
  if (!ids?.length) return
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
  if (error) throw error
}

/** Page à ouvrir pour une notification. */
export function notificationHref(n, organizationId) {
  if (!n.project_id) return null
  // L'élément peut appartenir à une autre organisation du membre.
  const base = `/${n.project?.organization_id ?? organizationId}/projects/${n.project_id}`
  const t = n.target ?? {}
  if (n.pin_id) return `${base}/tasks#pin-${n.pin_id}`
  if (t.meetingId) return `${base}/reunions/${t.meetingId}/compte-rendu`
  if (t.documentId) return `${base}/documents`
  if (t.reportId) return `${base}/rapports`
  return base
}

/** « à l'instant », « il y a 5 min », « hier à 14:03 », « 12/11 à 09:40 ». */
export function relativeTime(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return `aujourd'hui à ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `hier à ${time}`
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${time}`
}
