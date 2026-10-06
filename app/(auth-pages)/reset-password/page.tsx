'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { activateMembershipAction } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GeistSans } from 'geist/font/sans'
import Image from 'next/image'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState('')

  // La session de réinitialisation doit venir DU LIEN reçu par email, jamais
  // d'une session déjà ouverte dans ce navigateur : sinon on changerait le mot
  // de passe du compte connecté ici, qui n'est pas forcément le bon.
  useEffect(() => {
    let cancelled = false
    const expired = "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Demandez-en un nouveau."

    const establishSession = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      if (hash.get('error') || hash.get('error_code') || query.get('error') || query.get('error_code')) {
        return expired
      }

      // 1. Lien « implicite » : les jetons sont dans l'URL, valable sur tout appareil.
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        if (hash.get('type') && hash.get('type') !== 'recovery') return expired
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        window.history.replaceState(null, '', window.location.pathname)
        return sessionError || !data.session ? expired : null
      }

      // 2. Ancien lien « PKCE » (?code=…) : le client l'échange à l'initialisation,
      //    ce qui ne réussit que dans le navigateur qui a fait la demande.
      if (query.get('code')) {
        const { data } = await supabase.auth.getSession()
        window.history.replaceState(null, '', window.location.pathname)
        return data.session
          ? null
          : "Ce lien doit être ouvert dans le navigateur où la demande a été faite, ou il a expiré. Demandez-en un nouveau."
      }

      return "Ouvrez cette page depuis le lien reçu par email."
    }

    establishSession().then((problem) => {
      if (cancelled) return
      if (problem) setLinkError(problem)
      else setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError('Saisissez et confirmez votre nouveau mot de passe.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(
        /different from the old password/i.test(updateError.message)
          ? "Le nouveau mot de passe doit être différent de l'ancien."
          : "Impossible de mettre à jour le mot de passe. Demandez un nouveau lien."
      )
      setLoading(false)
      return
    }

    // Un compte invité qui passe par « mot de passe oublié » est activé au passage.
    await activateMembershipAction().catch(() => null)

    setSuccess(true)
    // Rechargement complet : le serveur relit la session fraîchement créée.
    setTimeout(() => window.location.assign('/workspaces'), 1500)
  }

  if (linkError) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center bg-[#fafaf9] px-6 ${GeistSans.className}`}>
        <div className="max-w-sm text-center">
          <h1 className="text-[17px] font-medium text-[#050505] mb-2">Lien invalide</h1>
          <p className="text-[13px] text-[#666660] mb-6">{linkError}</p>
          <Link
            href="/forgot-password"
            className="inline-block px-3 py-[7px] bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
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