'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Upload, User } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Outfit } from 'next/font/google'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function UserSettingsPage({params}) {
  const {organizationId} = params;
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)

  const [name, setName] = useState('')
  const [jobFunction, setJobFunction] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, profile, organization } = useUserData();  
  
  console.log('user', user)
  console.log('profile', profile)
  console.log('organization', organization)

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
        avatar_url: avatarUrl
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
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      setAvatarUrl(data.publicUrl)
    }
  }

  return (
    <div className={clsx("flex h-screen bg-gray-50 overflow-hidden", outfit.className)}>
      {/* Use the same Sidebar component for consistency */}
      <Sidebar organizationId={organizationId} currentPage="profile" />

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8 leading-8">
            Paramètres du compte
          </h1>

          <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {/* AVATAR */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">Photo de profil</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="h-full w-full object-cover" alt="Avatar" />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
                  <Upload className="w-4 h-4" />
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

            {/* NAME */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">Nom complet</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900"
              />
            </div>

            {/* JOB */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">Fonction</label>
              <input
                value={jobFunction}
                onChange={(e) => setJobFunction(e.target.value)}
                placeholder="Chef de projet, Architecte…"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* EMAIL (READ ONLY) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">Adresse email</label>
              <input
                value={email}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1 leading-4">
                L'adresse email ne peut pas être modifiée
              </p>
            </div>

            {/* ACTION */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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