'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GeistSans } from 'geist/font/sans'
import Image from 'next/image'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('error_code')) {
      router.push('/forgot-password')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        setReady(true)
      }
      if (event === 'INITIAL_SESSION' && !session) {
        router.push('/forgot-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError('Password and confirm password are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/sign-in'), 2000)
  }

  if (!ready) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center bg-[#fafaf9] ${GeistSans.className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#e5e5e2] border-t-[#0d0d0c]" />
      </div>
    )
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[#fafaf9] ${GeistSans.className}`}>

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col w-1/2 h-full bg-white items-center justify-center p-16 border-r border-[#e5e5e2] shrink-0">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center mx-auto mb-8">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={40} height={40} />
          </div>
          <h2 className="text-[40px] font-medium text-[#050505] leading-tight tracking-[-0.02em] mb-6">
            Nouveau mot de passe
          </h2>
          <p className="text-[#666660] text-[17px] leading-relaxed">
            Choisissez un nouveau mot de passe pour sécuriser votre compte.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex w-full lg:w-1/2 h-full items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md px-8 py-12">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-11 h-11 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={22} height={22} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[24px] font-medium text-[#050505] mb-3 tracking-[-0.011em]">
              Réinitialiser le mot de passe
            </h1>
            <p className="text-[13px] text-[#8a8a84]">
              Entrez votre nouveau mot de passe ci-dessous.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-[#0d0d0c]">
                  Nouveau mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  required
                  className="w-full h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#0d0d0c]">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  required
                  className="w-full h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
                />
              </div>
            </div>

            {error && <p className="text-[13px] text-[#9c1b1b]">{error}</p>}
            {success && <p className="text-[13px] text-[#0f7a3a]">Mot de passe mis à jour. Redirection...</p>}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 bg-[#0d0d0c] text-white font-medium py-2.5 px-4 rounded-[4px] text-[13px] hover:bg-[#1a1a18] transition-colors disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#8a8a84] mt-6">
            <Link
              href="/sign-in"
              className="text-[#2f5ee0] font-medium hover:text-[#264dc2] transition-colors underline underline-offset-4"
            >
              Retour à la connexion
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}