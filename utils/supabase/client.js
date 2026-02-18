// /utils/supabase/client.ts - REPLACE YOUR CURRENT FILE WITH THIS

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Keep your existing auth state handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully')
  }
  
  if (event === 'SIGNED_OUT') {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/sign-in'
  }
  
  if (event === 'USER_UPDATED' && !session) {
    console.error('Session lost, signing out')
    supabase.auth.signOut()
    window.location.href = '/sign-in'
  }
})