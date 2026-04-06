'use client'

import { EyeIcon, Paperclip, Scissors, X, Trash2, MapPin, MapPinOff, MoreVertical, Archive, RotateCcw } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import CategoryComboBox from './CategoryComboBox'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { focusOnPinAtom, pinsAtom, selectedPinAtom } from '@/store/atoms'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import PlacePinModal from './PlacePinModal'


export default function DrawerHeader({ pin, onClose, onPhotoUploaded, organization_id }) {
  const [, setFocusOnPin]  = useAtom(focusOnPinAtom)
  const [pins, setPins]    = useAtom(pinsAtom)
  const [, setSelectedPin] = useAtom(selectedPinAtom)
  const router             = useRouter()
  const fileInputRef       = useRef(null)
  const menuRef            = useRef(null)

  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [plans, setPlans]                   = useState([])
  const [loadingPlans, setLoadingPlans]     = useState(false)
  const [menuOpen, setMenuOpen]             = useState(false)

  const { user, profile } = useUserData(organization_id)
  const isGuest = profile?.role === 'guest'

  const hasPosition = pin.x != null && pin.y != null

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // ── Navigate to canvas ────────────────────────────────────────────────────
  const goToCanvas = () => {
    setFocusOnPin(pin)
    router.push(`/${pin.projects?.organization_id}/projects/${pin.project_id}/${pin?.plans?.id}`)
  }

  const activateSnippetMode = () => {
    setFocusOnPin(pin.id)
    router.push(
      `${pin.projects?.organization_id}/projects/${pin.project_id}/${pin?.plans?.id}/snippet/${pin.id}`
    )
  }

  // ── Open place modal ──────────────────────────────────────────────────────
  const openPlaceModal = async () => {
    setMenuOpen(false)
    setLoadingPlans(true)
    const { data, error } = await supabase
      .from('plans')
      .select('id, created_at, name, png_url, tiles_path')
      .eq('project_id', pin.project_id)
      .order('created_at', { ascending: true })
    if (!error) setPlans(data || [])
    setLoadingPlans(false)
    setShowPlaceModal(true)
  }

  const handlePlaced = (updatedPin) => {
    setPins(prev => prev.map(p => p.id === updatedPin.id ? updatedPin : p))
    setSelectedPin(updatedPin)
  }

  // ── Remove from plan ──────────────────────────────────────────────────────
  const removeFromPlan = async () => {
    setMenuOpen(false)
    if (!confirm('Retirer ce pin du plan ? Ses coordonnées seront effacées.')) return
    const { error } = await supabase
      .from('pdf_pins')
      .update({ x: null, y: null, plan_id: null, pdf_name: null })
      .eq('id', pin.id)
    if (error) { console.error(error); alert('Erreur lors du retrait du plan'); return }

    const updated = { ...pin, x: null, y: null, plan_id: null, pdf_name: null, plans: null }
    setPins(prev => prev.map(p => p.id === pin.id ? updated : p))
    setSelectedPin(updated)
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  const toggleArchive = async () => {
    setMenuOpen(false)
    const newVal = !pin.isArchived
    const { error } = await supabase
      .from('pdf_pins')
      .update({ isArchived: newVal })
      .eq('id', pin.id)
    if (error) { console.error(error); alert('Erreur lors de l\'archivage'); return }

    const updated = { ...pin, isArchived: newVal }
    setPins(prev => prev.map(p => p.id === pin.id ? updated : p))
    setSelectedPin(updated)
    if (newVal) onClose()
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  const onUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10)
    if (files.length === 0) return
    try {
      for (const file of files) {
        const filePath = `${pin.project_id}/${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from('pinphotos').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = await supabase.storage.from('pinphotos').getPublicUrl(filePath)
        const { data: newPinPhoto, error: pinPhotoError } = await supabase
          .from('pins_photos')
          .insert({ project_id: pin.project_id, pin_id: pin.id, public_url: publicUrl, sender_id: profile.id })
          .select().single()
        if (pinPhotoError) throw pinPhotoError
      /*  await supabase.from('events').insert({
          pin_id: pin.id, category: 'photo_upload',
          pin_photo_id: newPinPhoto.id, project_id: pin.project_id, user_id: user.auth_id,
        })
          */
      }
      onPhotoUploaded?.()
    } catch (err) {
      console.error(err)
      alert('Upload failed')
    } finally {
      e.target.value = ''
    }
  }

  // ── Soft delete ───────────────────────────────────────────────────────────
  const deletePin = async () => {
    if (!pin?.id || isGuest) return
    if (!confirm('Are you sure you want to delete this pin?')) return
    const { error } = await supabase.rpc('soft_delete_pin', { p_pin_id: pin.id })
    if (error) { console.error(error); alert('Failed to delete pin'); return }
    setPins(prev => prev.filter(p => p.id !== pin.id))
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-row justify-between items-center">
        <div className="text-sm">
          <CategoryComboBox pin={pin} organization_id={organization_id} />
        </div>

        <div className="flex flex-row gap-1 items-center">

          {/* View on canvas — only if positioned */}
          {hasPosition && (
            <button
              className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
              onClick={goToCanvas}
              title="Voir sur le plan"
            >
              <EyeIcon size={20} />
            </button>
          )}

          <button
            className="hover:bg-pink-100 rounded-full p-2 text-pink-500"
            onClick={activateSnippetMode}
            title="Créer un snippet du plan"
          >
            <Scissors size={20} />
          </button>

          <button
            className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
            onClick={onUploadClick}
            title="Joindre une photo"
          >
            <Paperclip size={20} />
          </button>

          <input
            ref={fileInputRef}
            multiple
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {!isGuest && (
            <button
              className="hover:bg-red-100 rounded-full p-2 text-red-500"
              onClick={deletePin}
              title="Supprimer"
            >
              <Trash2 size={20} />
            </button>
          )}

          {/* ── 3-dot menu ───────────────────────────────────────────────── */}
          {!isGuest && (
            <div className="relative" ref={menuRef}>
              <button
                className="hover:bg-gray-100 rounded-full p-2 text-gray-500 transition-colors"
                onClick={() => setMenuOpen(v => !v)}
                title="Plus d'options"
              >
                <MoreVertical size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg z-[1100] overflow-hidden py-1">

                  {/* Repositionner / Placer */}
                  <button
                    onClick={openPlaceModal}
                    disabled={loadingPlans}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                  >
                    {loadingPlans
                      ? <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
                      : <MapPin size={16} className="text-neutral-400" />
                    }
                    {hasPosition ? 'Repositionner sur le plan' : 'Placer sur un plan'}
                  </button>

                  {/* Retirer du plan */}
                  {hasPosition && (
                    <button
                      onClick={removeFromPlan}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <MapPinOff size={16} className="text-neutral-400" />
                      Retirer du plan
                    </button>
                  )}

                  <div className="h-px bg-neutral-100 my-1" />

                  {/* Archiver / Désarchiver */}
                  <button
                    onClick={toggleArchive}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                  >
                    {pin.isArchived
                      ? <RotateCcw size={16} className="text-neutral-400" />
                      : <Archive size={16} className="text-neutral-400" />
                    }
                    {pin.isArchived ? 'Désarchiver' : 'Archiver'}
                  </button>

                </div>
              )}
            </div>
          )}

          <button
            className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {showPlaceModal && (
        <PlacePinModal
          pin={pin}
          plans={plans}
          onClose={() => setShowPlaceModal(false)}
          onPlaced={handlePlaced}
        />
      )}
    </>
  )
}