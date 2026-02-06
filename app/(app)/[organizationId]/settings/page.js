'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { useUserData } from '@/hooks/useUserData'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Upload } from 'lucide-react'
import clsx from 'clsx'
import { Lexend } from 'next/font/google'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

const ORG_SIZES = [
  '1 – 5',
  '6 – 10',
  '11 – 25',
  '26 – 50',
  '51 – 100',
  '100+'
]

export default function OrganizationSettingsPage({params}) {
  const {organizationId} = params;
  const router = useRouter()
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const { user, profile, organization } = useUserData()
  const { isAdmin, isLoading: isCheckingAccess } = useIsAdmin()

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Redirect non-admins
  useEffect(() => {
    if (!isCheckingAccess && !isAdmin) {
      router.push(`/${organizationId}/projects`)
    }
  }, [isAdmin, isCheckingAccess, router, organizationId])

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
      alert('Paramètres sauvegardés avec succès!')
    } else {
      alert('Erreur lors de la sauvegarde')
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

  // Show loading while checking access OR if user is not admin (during redirect)
  if (isCheckingAccess || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx("flex h-screen bg-background font-sans overflow-hidden", lexend.className)}>
      <Sidebar organizationId={organizationId} currentPage="settings" />

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="mt-12 max-w-3xl">
          <h1 className="text-4xl font-bold font-heading mb-8">
            Paramètres de l'organisation
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
                Nom de l'organisation
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
                Taille de l'organisation
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
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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