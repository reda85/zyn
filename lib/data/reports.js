// Rapports d'un projet : historique, période couverte, sélection des éléments
// par type de rapport et appels au backend (génération, téléchargement,
// suppression). Utilisé par la page Rapports et par la liste des tâches.
import { supabase } from '@/utils/supabase/client'
import { BACKEND_URL } from '@/lib/config'
import { fetchAll } from '@/lib/data/fetchAll'
import { REPORT_KINDS } from '@/lib/data/reportKinds'

const DAY = 86400000
const pad = (n) => String(n).padStart(2, '0')
/** Date locale « AAAA-MM-JJ ». */
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (iso, n) => isoDay(new Date(new Date(`${iso}T12:00:00`).getTime() + n * DAY))
/** Jour local d'un horodatage ou d'une date simple. */
const dayOf = (v) => (!v ? null : /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : isoDay(new Date(v)))

export const fmtDay = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR') : '')
export function periodLabel(p) {
  if (!p?.start && !p?.end) return 'Tout le projet'
  if (p.start && p.end) return p.start === p.end ? `Le ${fmtDay(p.start)}` : `Du ${fmtDay(p.start)} au ${fmtDay(p.end)}`
  return p.start ? `Depuis le ${fmtDay(p.start)}` : `Jusqu'au ${fmtDay(p.end)}`
}

// ── Périodes ─────────────────────────────────────────────────────────────────
export const PERIOD_PRESETS = [
  { key: 'since-last', label: 'Depuis le dernier rapport' },
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 derniers jours' },
  { key: '30d', label: '30 derniers jours' },
  { key: 'all', label: 'Tout le projet' },
  { key: 'custom', label: 'Personnalisée' },
]

/** Période par défaut : la visite part du dernier rapport, le reste couvre tout. */
export const defaultPreset = (kind, lastReport) =>
  kind === 'visite' ? (lastReport ? 'since-last' : '7d') : 'all'

/** { start, end } en jours locaux, ou null pour tout le projet. */
export function resolvePeriod(preset, { lastReport, custom } = {}) {
  const today = isoDay()
  switch (preset) {
    case 'since-last':
      return lastReport ? { start: dayOf(lastReport.created_at), end: today } : null
    case 'today': return { start: today, end: today }
    case '7d': return { start: addDays(today, -6), end: today }
    case '30d': return { start: addDays(today, -29), end: today }
    case 'custom':
      return custom?.start || custom?.end ? { start: custom.start || null, end: custom.end || null } : null
    default: return null
  }
}

// ── Éléments concernés ───────────────────────────────────────────────────────
/** Éléments du projet (champs utiles au choix par période), sans les supprimés. */
export async function fetchReportCandidates(projectId) {
  return fetchAll(() =>
    supabase
      .from('pdf_pins')
      .select('id,type,created_at,date_debut,due_date,pin_number')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('pin_number', { ascending: true })
  )
}

/**
 * Identifiants repris par un rapport :
 * - réserves et observations : constatées pendant la période ;
 * - tâches : actives pendant la période (début ou échéance qui la recoupe).
 * Sans période, tous les éléments de la nature du rapport.
 */
export function itemsForReport(pins, kind, period) {
  const type = REPORT_KINDS[kind]?.pinType
  const start = period?.start ?? null
  const end = period?.end ?? null
  return pins
    .filter((p) => !type || (p.type || 'reserve') === type)
    .filter((p) => {
      if (!start && !end) return true
      if (kind === 'avancement') {
        const s = dayOf(p.date_debut) ?? dayOf(p.due_date)
        const e = dayOf(p.due_date) ?? s
        if (!s) return false
        return (!end || s <= end) && (!start || e >= start)
      }
      const d = dayOf(p.created_at)
      return (!start || d >= start) && (!end || d <= end)
    })
    .map((p) => p.id)
}

// ── Historique ───────────────────────────────────────────────────────────────
export async function fetchReports(projectId) {
  const { data, error } = await supabase
    .from('reports')
    .select('id,kind,title,file_name,file_size,item_count,period_start,period_end,created_at,template_id,members:created_by(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

/** Dernier rapport de chaque type (le plus récent d'abord dans la liste). */
export function lastReportByKind(reports) {
  const out = {}
  for (const r of reports) out[r.kind] ??= r
  return out
}

// ── Backend ──────────────────────────────────────────────────────────────────
async function backend(path, init = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session expirée, reconnectez-vous')
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers ?? {}) },
  })
  if (!response.ok) {
    const text = await response.text()
    let message = null
    try { message = JSON.parse(text).error } catch {}
    throw new Error([404, 410, 422].includes(response.status) && message
      ? message
      : `Erreur ${response.status} : ${(message || text).slice(0, 200)}`)
  }
  return response.json()
}

/** Génère un rapport ; renvoie { downloadUrl, fileName, reportId }. */
export async function generateReport(body) {
  const result = await backend('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!result.downloadUrl) throw new Error('URL de téléchargement manquante')
  return result
}

export const reportDownload = (id) => backend(`/api/reports/${id}/download`)
export const deleteReport = (id) => backend(`/api/reports/${id}`, { method: 'DELETE' })

/** Ouvre le téléchargement d'un fichier dans un nouvel onglet. */
export function startDownload(url, fileName) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'rapport.pdf'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** Images de planning jointes au rapport (stockage « reports »). */
export async function uploadReportImages(projectId, files) {
  const urls = []
  for (const file of files ?? []) {
    const ext = file.name.split('.').pop()
    const path = `planning/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('reports').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) {
      console.error('Planning image upload failed', error)
      continue
    }
    urls.push(supabase.storage.from('reports').getPublicUrl(data.path).data.publicUrl)
  }
  return urls
}

export const fmtSize = (bytes) =>
  bytes == null ? '' : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
