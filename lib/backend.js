import { supabase } from '@/utils/supabase/client'
import { BACKEND_URL } from './config'

/**
 * Appel au backend avec le jeton de l'utilisateur connecté.
 * Toutes les routes du backend (hors /health) exigent ce jeton.
 */
export async function backendFetch(path, init = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session expirée, reconnectez-vous')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function errorMessage(response) {
  const text = await response.text().catch(() => '')
  try {
    return JSON.parse(text).error || text
  } catch {
    return text
  }
}

/**
 * Demande un rapport au backend et renvoie { downloadUrl, fileName, fileSize }.
 *
 * La génération tourne en arrière-plan : le backend répond avec un identifiant
 * de travail, dont on interroge l'état. Une requête unique de plusieurs minutes
 * était coupée par les intermédiaires réseau sur les gros projets.
 *
 * Reste compatible avec un backend plus ancien, qui répond directement avec le
 * lien : `fallbackGet` est l'adresse GET à utiliser s'il ne connaît pas le POST.
 */
export async function requestReport(path, body, { fallbackGet = null, timeoutMs = 15 * 60 * 1000 } = {}) {
  let response = await backendFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...body, async: true }),
  })
  if (response.status === 404 && fallbackGet) {
    response = await backendFetch(fallbackGet, { headers: { Accept: 'application/json' } })
  }
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}: ${String(await errorMessage(response)).slice(0, 200)}`)
  }

  let payload = await response.json()
  if (payload.downloadUrl) return payload // réponse directe
  if (!payload.jobId) throw new Error('Réponse inattendue du serveur')

  const deadline = Date.now() + timeoutMs
  let failures = 0
  while (Date.now() < deadline) {
    await sleep(3000)
    let poll
    try {
      poll = await backendFetch(`/api/report/jobs/${payload.jobId}`, { headers: { Accept: 'application/json' } })
    } catch (error) {
      // Coupure passagère : le rapport continue côté serveur, on réessaie.
      if (++failures > 20) throw error
      continue
    }
    if (poll.status === 404) throw new Error('Le rapport a été interrompu côté serveur. Relancez la génération.')
    if (!poll.ok) {
      if (++failures > 20) throw new Error(`Erreur API ${poll.status}`)
      continue
    }
    failures = 0
    payload = await poll.json()
    if (payload.status === 'done') return payload
    if (payload.status === 'failed') throw new Error(payload.error || 'La génération du rapport a échoué')
  }
  throw new Error('La génération du rapport prend trop de temps. Réessayez avec moins d\'éléments.')
}
