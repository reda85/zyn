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
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

const ORG_SIZES = ['1 – 5', '6 – 10', '11 – 25', '26 – 50', '51 – 100', '100+']

function SettingsFormSkeleton() {
  return (
    <div className="bg-white border border-[#e5e5e2] rounded-[4px]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-10 rounded-[2px] bg-[#eeeeec] animate-pulse mb-3" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-[4px] bg-[#eeeeec] animate-pulse flex-shrink-0" />
          <div className="h-3.5 w-28 rounded-[2px] bg-[#eeeeec] animate-pulse" />
        </div>
      </div>

      {/* Name */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-32 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[4px] bg-[#f5f5f4] animate-pulse" />
      </div>

      {/* Size */}
      <div className="px-5 py-4 border-b border-[#eeeeec]">
        <div className="h-2.5 w-36 rounded-[2px] bg-[#eeeeec] animate-pulse mb-2" />
        <div className="h-9 w-full rounded-[4px] bg-[#f5f5f4] animate-pulse" />
      </div>

      {/* Action */}
      <div className="px-5 py-4 flex justify-end">
        <div className="h-9 w-28 rounded-[4px] bg-[#eeeeec] animate-pulse" />
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
      <div className={clsx('flex h-screen items-center justify-center bg-[#fafaf9]', GeistSans.className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e5e5e2] border-t-[#0d0d0c] mx-auto mb-3" />
          <p className="text-[13px] text-[#8a8a84]">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-[#fafaf9] overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="settings" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          <div className="mb-6">
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Paramètres</h1>
            <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>Gérez les informations de votre organisation</p>
          </div>

          {isFormLoading ? (
            <SettingsFormSkeleton />
          ) : (
            <div className="bg-white border border-[#e5e5e2] rounded-[4px]">
              {/* Logo */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-3', GeistMono.className)}>Logo</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-[4px] border border-[#e5e5e2] flex items-center justify-center overflow-hidden bg-[#f5f5f4] flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-[#b8b8b3] font-medium">Logo</span>
                    )}
                  </div>
                  <label className="cursor-pointer flex items-center gap-1.5 text-[13px] font-medium text-[#4a4a46] hover:text-[#0d0d0c] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Changer le logo
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Nom de l'organisation</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[4px] border border-[#e5e5e2] bg-white text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                />
              </div>

              {/* Size */}
              <div className="px-5 py-4 border-b border-[#eeeeec]">
                <label className={clsx('block text-[11px] font-medium text-[#8a8a84] uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Taille de l'organisation</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[4px] border border-[#e5e5e2] bg-white text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c]"
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