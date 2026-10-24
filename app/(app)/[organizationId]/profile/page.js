'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { Upload, User } from 'lucide-react'
import clsx from 'clsx'
import { outfit } from '@/lib/fonts';
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

function ProfileFormSkeleton() {
  return (
    <div className="bg-white border border-filet rounded-[12px] shadow-carte">
      {/* Avatar */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-24 rounded-[4px] bg-voile animate-pulse mb-3" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-voile animate-pulse flex-shrink-0" />
          <div className="h-3.5 w-28 rounded-[4px] bg-voile animate-pulse" />
        </div>
      </div>

      {/* Name */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-20 rounded-[4px] bg-voile animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[8px] bg-survol animate-pulse" />
      </div>

      {/* Job */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-16 rounded-[4px] bg-voile animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[8px] bg-survol animate-pulse" />
      </div>

      {/* Email */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-28 rounded-[4px] bg-voile animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[8px] bg-survol animate-pulse mb-1.5" />
        <div className="h-2.5 w-48 rounded-[4px] bg-voile animate-pulse" />
      </div>

      {/* Action */}
      <div className="px-5 py-4 flex justify-end">
        <div className="h-9 w-28 rounded-[8px] bg-voile animate-pulse" />
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
    <div className={clsx('flex h-screen bg-papier overflow-hidden', outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="profile" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Mon profil</h1>
            <p className={clsx('text-[13px] text-mine-clair mt-0.5', 'tabular-nums')}>
              Gérez vos informations personnelles
            </p>
          </div>

          {/* ── Profile Card ── */}
          {isFormLoading ? (
            <ProfileFormSkeleton />
          ) : (
            <div className="bg-white border border-filet rounded-[12px] shadow-carte">
              {/* Avatar */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-3', 'tabular-nums')}>
                  Photo de profil
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-voile border border-filet flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} className="h-full w-full object-cover" alt="Avatar" />
                    ) : (
                      <User className="w-4 h-4 text-trait" />
                    )}
                  </div>
                  <label className="cursor-pointer flex items-center gap-1.5 text-[14px] font-medium text-mine hover:text-encre transition-colors">
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
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>
                  Nom complet
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[8px] border border-filet bg-white text-[14px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                />
              </div>

              {/* Job */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>
                  Fonction
                </label>
                <input
                  value={jobFunction}
                  onChange={(e) => setJobFunction(e.target.value)}
                  placeholder="Chef de projet, Architecte…"
                  className="w-full px-3 py-2.5 rounded-[8px] border border-filet bg-white text-[14px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                />
              </div>

              {/* Email (read only) */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>
                  Adresse email
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-[8px] border border-filet bg-survol text-[14px] text-mine-clair cursor-not-allowed"
                />
                <p className="text-[12px] text-trait mt-1.5">
                  L'adresse email ne peut pas être modifiée
                </p>
              </div>

              {/* Action */}
              <div className="px-5 py-4 flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 rounded-[8px] bg-encre text-white text-[14px] font-medium hover:bg-encre-survol transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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