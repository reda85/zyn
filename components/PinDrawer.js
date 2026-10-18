'use client'

import { useState } from 'react'
import { GeistSans } from 'geist/font/sans'
import DrawerHeader from './DrawerHeader'
import DrawerBody from './DrawerBody'
import DrawerFooter from './DrawerFooter'
import { useSelectedPin } from '@/hooks/usePins'

/**
 * Tiroir du pin sélectionné. Unique pour toute l'application (liste des tâches
 * et vue plan) : il lit le pin via `useSelectedPin()` et relie lui-même
 * commentaires et photos à la timeline.
 */
export default function PinDrawer({ organization_id }) {
  const [selectedPin, selectPin] = useSelectedPin()
  const [newComment, setNewComment] = useState(null)
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0)

  if (!selectedPin) return null

  const closeDrawer = () => selectPin(null)

  return (
    <div
      className={`${GeistSans.className} fixed top-[64px] right-4 w-[500px] h-[calc(100vh-100px)] bg-white z-[1000] border border-[#e5e5e2] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] flex flex-col overflow-hidden`}
    >
      <div className="px-5 py-4 border-b border-[#eeeeec] shrink-0">
        <DrawerHeader
          organization_id={organization_id}
          pin={selectedPin}
          onClose={closeDrawer}
          onPhotoUploaded={() => setPhotoUploadTrigger((n) => n + 1)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <DrawerBody
          organization_id={organization_id}
          pin={selectedPin}
          newComment={newComment}
          photoUploadTrigger={photoUploadTrigger}
        />
      </div>

      <div className="px-5 py-4 border-t border-[#eeeeec] shrink-0">
        <DrawerFooter pin={selectedPin} onCommentAdded={setNewComment} />
      </div>
    </div>
  )
}
