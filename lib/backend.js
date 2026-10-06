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
