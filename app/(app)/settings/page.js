'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Upload } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Lexend } from 'next/font/google'
import { useUserData } from '@/hooks/useUserData'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

const ORG_SIZES = [
  '1 – 5',
  '6 – 10',
  '11 – 25',
  '26 – 50',
  '51 – 100',
  '100+'
]

export default function OrganizationSettingsPage() {
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, profile, organization } = useUserData();

  useEffect(() => {
    if (!selectedOrganization) return
    setName(selectedOrganization.name || '')
    setSize(selectedOrganization.size || '')
    setLogoUrl(selectedOrganization.logo_url || '')
  }, [selectedOrganization])

  const saveSettings = async () => {
    if (!selectedOrganization) return
    setSaving(true)

    const { error } = await supabase
      .from('organizations')
      .update({
        name,
        size,
        logo_url: logoUrl
      })
      .eq('id', organization.id)

    if (!error) {
      setSelectedOrganization(prev => ({
        ...prev,
        name,
        size,
        logo_url: logoUrl
      }))
    }

    setSaving(false)
  }

  const handleLogoUpload = async (file) => {
    console.log('handleLogoUpload', organization, file)
    if (!file || !organization) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${organization.id}/logo.${fileExt}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })

    if(error) console.error('Logo upload error:', error)

    if (!error) {
      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      setLogoUrl(data.publicUrl)
    }
  }

  return (
    <div className={clsx("flex h-screen bg-background font-sans overflow-hidden", lexend.className)}>
      {/* ASIDE */}
      <aside className="w-64 h-screen bg-secondary/20 border-r border-border/40 flex flex-col">
        <div className="px-4 py-5 flex-col border border-border/50 bg-card/80 backdrop-blur-sm flex mx-4 my-6 rounded-xl gap-2 shadow-sm">
          <h2 className="text-sm font-semibold font-heading text-foreground">{organization?.name}</h2>
          <p className="text-xs text-muted-foreground">{organization?.members[0]?.count} membres</p>
        </div>
      
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/projects" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link 
            href="/members" 
             className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Users className="w-5 h-5" /> Membres
          </Link>
          <Link 
            href="/reports" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <BarChart3 className="w-5 h-5" /> Rapports
          </Link>
          <Link 
            href="/settings" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20"
          >
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
        </nav>
          {/* PROFILE (BOTTOM) */}
  <div className="px-4 pb-6">
    <Link
      href="/profile"
      className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-secondary/50 transition-all"
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
        {/* Replace with img if you have avatar_url */}
        MR
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          Marouane Reda
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Mon profil
        </p>
      </div>
    </Link>
  </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="mt-12 max-w-3xl">
          <h1 className="text-4xl font-bold font-heading mb-8">
            Paramètres de l’organisation
          </h1>

          <div className="space-y-6 bg-neutral-50 border border-border/50 rounded-xl p-6 shadow-sm ">
            {/* LOGO */}
            <div>
              <label className="block text-base font-semibold mb-2">Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl  border border-border/50 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Logo</span>
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-primary">
                  <Upload className="w-4 h-4" />
                  Changer le logo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {/* NAME */}
            <div>
              <label className="block text-base font-semibold mb-2">
                Nom de l’organisation
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/50  focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* SIZE */}
            <div>
              <label className="block text-base font-semibold mb-2">
                Taille de l’organisation
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 "
              >
                <option value="">Sélectionner</option>
                {ORG_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* ACTION */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={saveSettings}
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
