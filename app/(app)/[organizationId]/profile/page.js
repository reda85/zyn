'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { Upload, User } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

function ProfileFormSkeleton() {
  return (
    <div className="bg-white border border-[#e5e5e2] rounded-[4px]">
      {/* Avatar */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-24 rounded-[2px] bg-[#eeeeec] animate-pulse mb-3" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#eeeeec] animate-pulse flex-shrink-0" />
          <div className="h-3.5 w-28 rounded-[2px] bg-[#eeeeec] animate-pulse" />
        </div>
      </div>

      {/* Name */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-20 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[4px] bg-[#f5f5f4] animate-pulse" />
      </div>

      {/* Job */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-16 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[4px] bg-[#f5f5f4] animate-pulse" />
      </div>

      {/* Email */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-28 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[4px] bg-[#f5f5f4] animate-pulse mb-1.5" />
        <div className="h-2.5 w-48 rounded-[2px] bg-[#eeeeec] animate-pulse" />
      </div>

      {/* Action */}
      <div className="px-5 py-4 flex justify-end">
        <div className="h-9 w-28 rounded-[4px] bg-[#eeeeec] animate-pulse" />
      </div>
    </div>
  )
}

export default function UserSettingsPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)

  const [name, setName] = useState('')
  const [jobFunction, setJobFunction] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, profile, organization } = useUserData()

  const isFormLoading = !profile

  useEffect(() => {
    setName(profile?.name || '')
    setJobFunction(profile?.job_description || '')
    setAvatarUrl(profile?.avatar_url || '')
    setEmail(user?.email || '')
  }, [profile])

  const saveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)

    // La ligne `members` a son propre identifiant (≠ identifiant d'authentification).
    const { error } = await supabase
      .from('members')
      .update({ name, job_description: jobFunction, avatar_url: avatarUrl })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      console.error('saveProfile', error)
      alert("Erreur lors de l'enregistrement du profil")
      return
    }
    // Recharge la session côté serveur : le nouveau profil est repris partout.
    router.refresh()
  }

  const handleAvatarUpload = async (file) => {
    if (!file || !user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
  }

  return (
    <div className={clsx('flex h-screen bg-[#fafaf9] overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="profile" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Mon profil</h1>
            <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
              Gérez vos informations personnelles
            </p>
          </div>

          {/* ── Profile Card ── */}
          {isFormLoading ? (
            <ProfileFormSkeleton />
          ) : (
            <div className="bg-white border border-[#e5e5e2] rounded-[4px]">
              {/* Avatar */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-3', GeistMono.className)}>
                  Photo de profil
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} className="h-full w-full object-cover" alt="Avatar" />
                    ) : (
                      <User className="w-4 h-4 text-[#b8b8b3]" />
                    )}
                  </div>
                  <label className="cursor-pointer flex items-center gap-1.5 text-[13px] font-medium text-[#4a4a46] hover:text-[#0d0d0c] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Changer la photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleAvatarUpload(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>
                  Nom complet
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[4px] border border-[#e5e5e2] bg-white text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                />
              </div>

              {/* Job */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>
                  Fonction
                </label>
                <input
                  value={jobFunction}
                  onChange={(e) => setJobFunction(e.target.value)}
                  placeholder="Chef de projet, Architecte…"
                  className="w-full px-3 py-2.5 rounded-[4px] border border-[#e5e5e2] bg-white text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                />
              </div>

              {/* Email (read only) */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>
                  Adresse email
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-[4px] border border-[#e5e5e2] bg-[#f5f5f4] text-[13px] text-[#8a8a84] cursor-not-allowed"
                />
                <p className="text-[11px] text-[#b8b8b3] mt-1.5">
                  L'adresse email ne peut pas être modifiée
                </p>
              </div>

              {/* Action */}
              <div className="px-5 py-4 flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 rounded-[4px] bg-[#0d0d0c] text-white text-[13px] font-medium hover:bg-[#1a1a18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}