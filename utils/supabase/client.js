import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Add global auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully')
  }
  
  if (event === 'SIGNED_OUT') {
    // Clear everything and redirect
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/sign-in'
  }
  
  // Critical: Handle refresh failures
  if (event === 'USER_UPDATED' && !session) {
    console.error('Session lost, signing out')
    supabase.auth.signOut()
    window.location.href = '/sign-in'
  }
})