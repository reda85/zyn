'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { Upload, User } from 'lucide-react'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function UserSettingsPage({ params }) {
  const { organizationId } = params
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)

  const [name, setName] = useState('')
  const [jobFunction, setJobFunction] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, profile, organization } = useUserData()

  useEffect(() => {
    setName(profile?.name || '')
    setJobFunction(profile?.job_description || '')
    setAvatarUrl(profile?.avatar_url || '')
    setEmail(user?.email || '')
  }, [profile])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    await supabase
      .from('members')
      .upsert({
        id: user.id,
        name,
        job_function: jobFunction,
        avatar_url: avatarUrl,
      })

    setSaving(false)
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
    <div className={clsx('flex h-screen bg-neutral-50 overflow-hidden', outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="profile" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-neutral-900">Mon profil</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gérez vos informations personnelles
            </p>
          </div>

          {/* ── Profile Card ── */}
          <div className="bg-white border border-neutral-200 rounded-lg">
            {/* Avatar */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Photo de profil
              </label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="h-full w-full object-cover" alt="Avatar" />
                  ) : (
                    <User className="w-4 h-4 text-neutral-300" />
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
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
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Nom complet
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
              />
            </div>

            {/* Job */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Fonction
              </label>
              <input
                value={jobFunction}
                onChange={(e) => setJobFunction(e.target.value)}
                placeholder="Chef de projet, Architecte…"
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
              />
            </div>

            {/* Email (read only) */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Adresse email
              </label>
              <input
                value={email}
                disabled
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-neutral-300 mt-1.5">
                L'adresse email ne peut pas être modifiée
              </p>
            </div>

            {/* Action */}
            <div className="px-5 py-4 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-[13px] font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}