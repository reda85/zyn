'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Upload, User } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Lexend } from 'next/font/google'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function UserSettingsPage({params}) {
  const {organizationId} = params;
  const [selectedOrganization] = useAtom(selectedOrganizationAtom)

  //const [user, setUser] = useState(null)
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
    <div className={clsx("flex h-screen bg-background font-sans overflow-hidden", lexend.className)}>
      {/* ASIDE */}
<Sidebar organizationId={organizationId} currentPage="profile" />


      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="mt-12 max-w-3xl">
          <h1 className="text-4xl font-bold font-heading mb-8">
            Paramètres du compte
          </h1>

          <div className="space-y-6 bg-neutral-50 border border-border/50 rounded-xl p-6 shadow-sm">
            {/* AVATAR */}
            <div>
              <label className="block text-sm font-medium mb-2">Photo de profil</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-secondary/40 border border-border/50 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="h-full w-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-primary">
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
              <label className="block text-sm font-medium mb-2">Nom complet</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* JOB */}
            <div>
              <label className="block text-sm font-medium mb-2">Fonction</label>
              <input
                value={jobFunction}
                onChange={(e) => setJobFunction(e.target.value)}
                placeholder="Chef de projet, Architecte…"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* EMAIL (READ ONLY) */}
            <div>
              <label className="block text-sm font-medium mb-2">Adresse email</label>
              <input
                value={email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-secondary/30 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                L’adresse email ne peut pas être modifiée
              </p>
            </div>

            {/* ACTION */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }
        .nav-item:hover {
          background: hsl(var(--secondary) / 0.5);
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  )
}
