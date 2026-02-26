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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Vérification des accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx("flex h-screen bg-gray-50 overflow-hidden", outfit.className)}>
      <Sidebar organizationId={organizationId} currentPage="settings" />

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8 leading-8">
            Paramètres de l'organisation
          </h1>

          <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {/* LOGO */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-gray-400">Logo</span>
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
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
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">
                Nom de l'organisation
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900"
              />
            </div>

            {/* SIZE */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 leading-5">
                Taille de l'organisation
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900"
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