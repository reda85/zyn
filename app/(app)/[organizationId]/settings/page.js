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
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

const ORG_SIZES = [
  '1 – 5',
  '6 – 10',
  '11 – 25',
  '26 – 50',
  '51 – 100',
  '100+',
]

export default function OrganizationSettingsPage({ params }) {
  const { organizationId } = params
  const router = useRouter()
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const { user, profile, organization } = useUserData()
  const { isAdmin, isLoading: isCheckingAccess } = useIsAdmin()

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)

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
        logo_url: logoUrl,
      })
      .eq('id', organization.id)

    if (!error) {
      setSelectedOrganization((prev) => ({
        ...prev,
        name,
        size,
        logo_url: logoUrl,
      }))
      alert('Paramètres sauvegardés avec succès!')
    } else {
      alert('Erreur lors de la sauvegarde')
    }

    setSaving(false)
  }

  const handleLogoUpload = async (file) => {
    if (!file || !organization) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${organization.id}/logo.${fileExt}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })

    if (error) console.error('Logo upload error:', error)

    if (!error) {
      const { data } = supabase.storage.from('logos').getPublicUrl(filePath)
      setLogoUrl(data.publicUrl)
    }
  }

  if (isCheckingAccess || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-900 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-400">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex h-screen bg-neutral-50 overflow-hidden', outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="settings" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-xl">
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-neutral-900">Paramètres</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gérez les informations de votre organisation
            </p>
          </div>

          {/* ── Settings Card ── */}
          <div className="bg-white border border-neutral-200 rounded-lg">
            {/* Logo */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Logo
              </label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg border border-neutral-200 flex items-center justify-center overflow-hidden bg-neutral-50 flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-neutral-300 font-medium">Logo</span>
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
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

            {/* Name */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Nom de l'organisation
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900 placeholder:text-neutral-300"
              />
            </div>

            {/* Size */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                Taille de l'organisation
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] focus:outline-none focus:border-neutral-400 transition-colors text-neutral-900"
              >
                <option value="" className="text-neutral-300">
                  Sélectionner
                </option>
                {ORG_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="px-5 py-4 flex justify-end">
              <button
                onClick={saveSettings}
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