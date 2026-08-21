'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GeistSans } from 'geist/font/sans'

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
      <div className={`flex h-screen items-center justify-center bg-[#fafaf9] ${GeistSans.className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e5e5e2] border-t-[#0d0d0c]" />
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex-1 flex flex-col w-full gap-2 text-[#0d0d0c] min-w-64 max-w-64 mx-auto ${GeistSans.className}`}
    >
      <div>
        <h1 className="text-[20px] font-medium text-[#050505] tracking-[-0.011em]">Reset password</h1>
        <p className="text-[13px] text-[#8a8a84]">
          Please enter your new password below.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <Label htmlFor="password" className="text-[13px] font-medium text-[#0d0d0c]">New password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          className="h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
        />

        <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#0d0d0c] mt-3">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
          className="h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
        />

        {error && <p className="text-[#9c1b1b] text-[13px] mt-1">{error}</p>}
        {success && <p className="text-[13px] text-[#0f7a3a] mt-1">Password updated. Redirecting...</p>}

        <button
          type="submit"
          disabled={loading || success}
          className="w-full rounded-[4px] bg-[#0d0d0c] text-white px-4 py-2.5 text-[13px] font-medium hover:bg-[#1a1a18] transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? 'Updating...' : 'Reset password'}
        </button>
      </div>
    </form>
  )
}