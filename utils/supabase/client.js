import { createBrowserClient } from '@supabase/ssr'
import { getCookieDomain } from './cookie-domain'

// Même domaine de cookie que le serveur et le middleware (voir cookie-domain.ts).
const cookieOptions = typeof window !== 'undefined' ? getCookieDomain(window.location.host) : {}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { cookieOptions }
)

// Pages qui établissent elles-mêmes une session à partir d'un lien reçu par email.
const LINK_PAGES = ['/accept-invite', '/reset-password']

supabase.auth.onAuthStateChange((event, session) => {
  if (typeof window === 'undefined') return
  if (LINK_PAGES.some((path) => window.location.pathname.startsWith(path))) return

  if (event === 'SIGNED_OUT') {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/sign-in'
  }

  if (event === 'USER_UPDATED' && !session) {
    supabase.auth.signOut()
    window.location.href = '/sign-in'
  }
})
