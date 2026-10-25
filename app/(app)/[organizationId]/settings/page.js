'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { useUserData } from '@/hooks/useUserData'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Upload } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans';

const ORG_SIZES = ['1 – 5', '6 – 10', '11 – 25', '26 – 50', '51 – 100', '100+']

function SettingsFormSkeleton() {
  return (
    <div className="bg-white border border-filet rounded-[12px] shadow-carte">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-10 rounded-[4px] bg-voile animate-pulse mb-3" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-[8px] bg-voile animate-pulse flex-shrink-0" />
          <div className="h-3.5 w-28 rounded-[4px] bg-voile animate-pulse" />
        </div>
      </div>

      {/* Name */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-32 rounded-[4px] bg-voile animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[8px] bg-survol animate-pulse" />
      </div>

      {/* Size */}
      <div className="px-5 py-4 border-b border-voile">
        <div className="h-2.5 w-36 rounded-[4px] bg-voile animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[8px] bg-survol animate-pulse" />
      </div>

      {/* Action */}
      <div className="px-5 py-4 flex justify-end">
        <div className="h-9 w-28 rounded-[8px] bg-voile animate-pulse" />
      </div>
    </div>
  )
}

export default function OrganizationSettingsPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const { user, profile, organization, organizations, isAdmin } = useUserData()
  const isCheckingAccess = organizations.length === 0

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const isFormLoading = !selectedOrganization

  useEffect(() => {
    if (isCheckingAccess) return
    if (!isAdmin) router.push(`/${organizationId}/projects`)
  }, [isCheckingAccess, isAdmin, organizationId])

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
      .update({ name, size, logo_url: logoUrl })
      .eq('id', organization.id)

    if (!error) {
      setSelectedOrganization((prev) => ({ ...prev, name, size, logo_url: logoUrl }))
      // Recharge la session côté serveur : la barre latérale reprend le nouveau nom / logo.
      router.refresh()
      alert('Paramètres sauvegardés avec succès!')
    } else {
      alert('Erreur lors de la sauvegarde')
    }

    setSaving(false)
  }

  const handleLogoUpload = async (file) => {
    if (!file || !organization) return
    if (!file.type.startsWith('image/')) { alert('Only image files are allowed'); return }

    const fileExt = file.name.split('.').pop()
    const filePath = `${organization.id}/logo-${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('logos').upload(filePath, file)
    if (error) { console.error('Upload failed:', error.message); alert(error.message); return }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath)
    setLogoUrl(data.publicUrl)
  }

  if (isCheckingAccess || !isAdmin) {
    return (
      <div className={clsx('flex h-screen items-center justify-center bg-papier', GeistSans.className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-filet border-t-encre mx-auto mb-3" />
          <p className="text-[14px] text-mine-clair">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-papier overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="settings" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Paramètres</h1>
            <p className={clsx('text-[13px] text-mine-clair mt-0.5', 'tabular-nums')}>Gérez les informations de votre organisation</p>
          </div>

          {isFormLoading ? (
            <SettingsFormSkeleton />
          ) : (
            <div className="bg-white border border-filet rounded-[12px] shadow-carte">
              {/* Logo */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-3', 'tabular-nums')}>Logo</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-[8px] border border-filet flex items-center justify-center overflow-hidden bg-survol flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-trait font-medium">Logo</span>
                    )}
                  </div>
                  <label className="cursor-pointer flex items-center gap-1.5 text-[14px] font-medium text-mine hover:text-encre transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Changer le logo
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Nom de l'organisation</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[8px] border border-filet bg-white text-[14px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                />
              </div>

              {/* Size */}
              <div className="px-5 py-4 border-b border-voile">
                <label className={clsx('block text-[12px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Taille de l'organisation</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[8px] border border-filet bg-white text-[14px] focus:outline-none focus:border-encre transition-colors text-encre"
                >
                  <option value="">Sélectionner</option>
                  {ORG_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Action */}
              <div className="px-5 py-4 flex justify-end">
                <button
                  onClick={saveSettings}
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