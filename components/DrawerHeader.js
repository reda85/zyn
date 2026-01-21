import { EyeIcon, Paperclip, Scissors, X, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import CategoryComboBox from './CategoryComboBox'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { focusOnPinAtom, pinsAtom } from '@/store/atoms'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'


export default function DrawerHeader({ pin, onClose, onPhotoUploaded }) {
  const [, setFocusOnPin] = useAtom(focusOnPinAtom)
  const [pins, setPins] = useAtom(pinsAtom)
  const router = useRouter()
  const fileInputRef = useRef(null)

  const {user, profile, organization} = useUserData()

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

  // 📎 Upload image → create pdf_pin + event
  const onUploadClick = () => {
    fileInputRef.current?.click()
  }

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files || []).slice(0, 10)

  if (files.length === 0) return

  try {
    for (const file of files) {
      // 1️⃣ Upload to storage
      const filePath = `${pin.project_id}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('pinphotos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = await supabase.storage
        .from('pinphotos')
        .getPublicUrl(filePath)

      // 2️⃣ Create pins_photos record
      const { data: newPinPhoto, error: pinPhotoError } = await supabase
        .from('pins_photos')
        .insert({
          project_id: pin.project_id,
          pin_id: pin.id,
          public_url: publicUrl,
          sender_id: user.auth_id,
        })
        .select()
        .single()

      if (pinPhotoError) throw pinPhotoError

      // 3️⃣ Create event
      const { error: eventError } = await supabase.from('events').insert({
        pin_id: pin.id,
        category: 'photo_upload',
        pin_photo_id: newPinPhoto.id,
        project_id: pin.project_id,
        user_id: user.auth_id,
      })

      if (eventError) throw eventError
    }

    // 4️⃣ Notify parent once after all uploads
    if (onPhotoUploaded) {
      onPhotoUploaded()
    }
  } catch (err) {
    console.error(err)
    alert('Upload failed')
  } finally {
    // Important: allow re-selecting the same files later
    e.target.value = ''
  }
}


  // 🗑 Soft delete pin
  const deletePin = async () => {
    if (!pin?.id) return
    if (!confirm('Are you sure you want to delete this pin?')) return

    const { error } = await supabase.rpc('soft_delete_pin', { p_pin_id: pin.id })
    if (error) {
      console.error(error)
      alert('Failed to delete pin')
    } else {
      setPins(prev => prev.filter(p => p.id !== pin.id))
      onClose()
    }
  }

  return (
    <div className="flex flex-row justify-between items-center">
      <div className="text-sm">
        <CategoryComboBox pin={pin} />
      </div>

      <div className="flex flex-row gap-2 items-center">
        {pin.plans && (
          <button
            className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
            onClick={goToCanvas}
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

        {/* 📎 Upload photo */}
        <button
          className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
          onClick={onUploadClick}
          title="Attach photo"
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

        <button
          className="hover:bg-red-100 rounded-full p-2 text-red-500"
          onClick={deletePin}
        >
          <Trash2 size={20} />
        </button>

        <button
          className="hover:bg-gray-100 rounded-full p-2 text-gray-500"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}