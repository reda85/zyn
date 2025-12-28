'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'
import { Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

function AcceptInviteContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    const checkInvitation = async () => {
      // Check for error in URL hash
      const hash = window.location.hash
      if (hash.includes('error=access_denied') || hash.includes('otp_expired')) {
        setLinkExpired(true)
        setError('Le lien d\'invitation a expiré ou est invalide. Veuillez demander une nouvelle invitation.')
        return
      }

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setError('Erreur de session')
        return
      }

      if (session?.user) {
        setUserEmail(session.user.email)
        
        // Check if user already has a password set
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // User is already authenticated, redirect to app
         // router.push('/projects')
        }
      } else {
        setLinkExpired(true)
        setError('Aucune session trouvée. Veuillez cliquer sur le lien dans votre email.')
        setTimeout(() => router.replace('/sign-in'), 3000)
      }
    }

    checkInvitation()
  }, [router])

  const handleAcceptInvite = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Update member status to active
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('members')
          .update({ status: 'active' })
          .eq('email', user.email)
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/(app)/projects')
      }, 2000)

    } catch (error) {
      console.error('Accept invite error:', error)
      setError(error.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const requestNewInvite = () => {
    router.push('/sign-in')
  }

  return (
    <div className={clsx("min-h-screen bg-background flex items-center justify-center p-6", lexend.className)}>
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-8">
          {linkExpired ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">
                Lien expiré
              </h2>
              <p className="text-muted-foreground mb-6">
                {error}
              </p>
              <button
                onClick={requestNewInvite}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
              >
                Retour à la connexion
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">
                Bienvenue!
              </h2>
              <p className="text-muted-foreground">
                Votre compte a été activé. Redirection en cours...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold font-heading text-foreground mb-2">
                  Accepter l'invitation
                </h1>
                <p className="text-muted-foreground">
                  Définissez votre mot de passe pour commencer
                </p>
                {userEmail && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {userEmail}
                  </div>
                )}
              </div>

              <form onSubmit={handleAcceptInvite} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border/50 rounded-xl bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border/50 rounded-xl bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && !linkExpired && (
                  <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !userEmail}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Activation...' : 'Activer mon compte'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>En acceptant cette invitation, vous acceptez nos conditions d'utilisation</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

// Main component with Suspense wrapper
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInviteContent />
    </Suspense>
  )
}