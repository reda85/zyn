import { supabase } from '@/utils/supabase/client'

// ── Réunions ──────────────────────────────────────────────────────────────────

export async function fetchMeetings(projectId) {
  const { data, error } = await supabase
    .from('meetings')
    .select('id,numero,date,heure,lieu,objet,statut,diffusee_at,prochaine_date,created_by:members!meetings_created_by_fkey(name)')
    .eq('project_id', projectId)
    .order('numero', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .select(`*,
      created_by_member:members!meetings_created_by_fkey(name),
      meeting_attendees(*),
      meeting_lot_progress(*)`)
    .eq('id', meetingId)
    .single()
  if (error) throw error
  data.meeting_attendees?.sort((a, b) => a.ordre - b.ordre)
  return data
}

/** Avancement constaté à la réunion précédente, par lot. */
export async function fetchPreviousProgress(projectId, numero) {
  if (numero <= 1) return {}
  const { data, error } = await supabase
    .from('meetings')
    .select('numero, meeting_lot_progress(lot_id, avancement)')
    .eq('project_id', projectId)
    .lt('numero', numero)
    .order('numero', { ascending: false })
    .limit(1)
  if (error) throw error
  const prev = data?.[0]
  return Object.fromEntries((prev?.meeting_lot_progress ?? []).map((p) => [p.lot_id, p.avancement]))
}

export async function createMeeting(projectId) {
  const { data, error } = await supabase.rpc('creer_reunion', { p_project_id: projectId })
  if (error) throw error
  return data
}

export async function updateMeeting(meetingId, fields) {
  const { error } = await supabase.from('meetings').update(fields).eq('id', meetingId)
  if (error) throw error
}

export async function deleteMeeting(meetingId) {
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
  if (error) throw error
}

export async function diffuseMeeting(meetingId) {
  const { error } = await supabase.rpc('diffuser_reunion', { p_meeting_id: meetingId })
  if (error) throw error
}

export async function reopenMeeting(meetingId) {
  const { error } = await supabase.rpc('rouvrir_reunion', { p_meeting_id: meetingId })
  if (error) throw error
}

// ── Présents ──────────────────────────────────────────────────────────────────

export async function addAttendee(meetingId, fields) {
  const { data, error } = await supabase
    .from('meeting_attendees')
    .insert([{ meeting_id: meetingId, ...fields }])
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateAttendee(id, fields) {
  const { error } = await supabase.from('meeting_attendees').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteAttendee(id) {
  const { error } = await supabase.from('meeting_attendees').delete().eq('id', id)
  if (error) throw error
}

// ── Avancement ────────────────────────────────────────────────────────────────

export async function saveProgress(meetingId, lotId, fields) {
  const { error } = await supabase
    .from('meeting_lot_progress')
    .upsert({ meeting_id: meetingId, lot_id: lotId, ...fields }, { onConflict: 'meeting_id,lot_id' })
  if (error) throw error
}

// ── Points à suivre ───────────────────────────────────────────────────────────

const POINT_COLUMNS = `*,
  ouverture:meetings!meeting_points_meeting_id_fkey(id,numero,date),
  cloture:meetings!meeting_points_clos_meeting_id_fkey(id,numero,date),
  meeting_point_suivis(meeting_id,texte)`

export async function fetchProjectPoints(projectId) {
  const { data, error } = await supabase
    .from('meeting_points')
    .select(POINT_COLUMNS)
    .eq('project_id', projectId)
    .order('numero', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createPoint(fields) {
  const { data, error } = await supabase.from('meeting_points').insert([fields]).select(POINT_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updatePoint(id, fields) {
  const { data, error } = await supabase.from('meeting_points').update(fields).eq('id', id).select(POINT_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deletePoint(id) {
  const { error } = await supabase.from('meeting_points').delete().eq('id', id)
  if (error) throw error
}

/** Commentaire de suivi d'un point pour une réunion ; vide → supprimé. */
export async function saveSuivi(pointId, meetingId, texte) {
  const clean = texte?.trim()
  const q = supabase.from('meeting_point_suivis')
  const { error } = clean
    ? await q.upsert({ point_id: pointId, meeting_id: meetingId, texte: clean }, { onConflict: 'point_id,meeting_id' })
    : await q.delete().eq('point_id', pointId).eq('meeting_id', meetingId)
  if (error) throw error
}

// ── Lecture d'une réunion ─────────────────────────────────────────────────────

/**
 * Points à l'ordre du jour de la réunion n° `numero` : ouverts à cette date,
 * ou soldés ce jour-là. État : nouveau, en cours (reporté) ou soldé.
 */
export function pointsForMeeting(points, meeting) {
  return points
    .filter((p) => p.ouverture?.numero <= meeting.numero && (!p.cloture || p.cloture.numero >= meeting.numero))
    .map((p) => ({
      ...p,
      etat: p.cloture?.numero === meeting.numero ? 'solde' : p.ouverture?.id === meeting.id ? 'nouveau' : 'en_cours',
      suivi: p.meeting_point_suivis?.find((s) => s.meeting_id === meeting.id)?.texte ?? '',
      historique: (p.meeting_point_suivis ?? []).filter((s) => s.meeting_id !== meeting.id),
    }))
}

export const POINT_TYPES = {
  action: { label: 'Action', short: 'A' },
  decision: { label: 'Décision', short: 'D' },
  information: { label: 'Information', short: 'I' },
}

export const ETATS = {
  nouveau: { label: 'Nouveau', className: 'bg-tirage-pale text-tirage' },
  en_cours: { label: 'En cours', className: 'bg-voile text-mine' },
  solde: { label: 'Soldé', className: 'bg-valide-pale text-valide' },
}

export const PRESENCES = {
  present: 'Présent',
  absent: 'Absent',
  excuse: 'Excusé',
}

export function fmtLongDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtShortDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
