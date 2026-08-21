import { supabase } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import dayjs from "dayjs"
import 'dayjs/locale/fr'
import { Clock, X, Download, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react"
import { GeistMono } from "geist/font/mono"
import clsx from "clsx"

dayjs.locale('fr')

// ─── Field label map (from mobile) ───────────────────────────────────────────
const FIELD_LABELS = {
  name: 'le nom',
  note: 'la note',
  status_id: 'le statut',
  category_id: 'la catégorie',
  assigned_to: "l'assigné",
  due_date: "la date d'échéance",
  x: 'la position X',
  y: 'la position Y',
  tags: 'les tags',
  isArchived: "l'archivage",
  plan_id: 'le plan',
  pdf_name: 'le nom du PDF',
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
// Muted variants of the same hues (kept distinct per user, desaturated to fit the system's "muted color, loud signals" principle)
const AVATAR_COLORS = [
  '#b45454','#b0568f','#8f5fa8','#5c63a8',
  '#4d70a8','#3d8a96','#3f9186','#b0703f',
]

function Avatar({ name }) {
  const initials = (() => {
    if (!name) return '??'
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length === 0) return '??'
    const first = parts[0][0].toUpperCase()
    const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : ''
    return `${first}${last}`
  })()

  const hash = initials.charCodeAt(0) + initials.charCodeAt(initials.length - 1)
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length]

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-medium shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  )
}

// ─── Modification diff (ported from mobile) ──────────────────────────────────
function ModificationDiff({ metadata }) {
  const [expanded, setExpanded] = useState({})
  if (!metadata || typeof metadata !== 'object') return null
  const changes = Object.entries(metadata)
  if (changes.length === 0) return null

  const toggle = (field) =>
    setExpanded((prev) => ({ ...prev, [field]: !prev[field] }))

  const formatVal = (val) =>
    val === null || val === undefined || val === ''
      ? <span className="italic text-[#8a8a84]">vide</span>
      : <span className="font-medium">"{String(val)}"</span>

  return (
    <div className="mt-2 bg-[#e6eeff] border border-[#c5d6fb] rounded-[4px] px-3 py-2.5 space-y-2">
      {changes.map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="space-y-1">
          <p className="text-[12px] text-[#1e3a8a]">
            A modifié <span className="font-medium">{FIELD_LABELS[field] || field}</span> → {formatVal(newVal)}
          </p>
          <button
            onClick={() => toggle(field)}
            className="flex items-center gap-1 text-[11px] text-[#264dc2] hover:text-[#1e3a8a] transition-colors"
          >
            {expanded[field]
              ? <><ChevronUp className="w-3 h-3" /> Masquer</>
              : <><ChevronDown className="w-3 h-3" /> Valeur précédente</>}
          </button>
          {expanded[field] && (
            <div className="flex items-center gap-1.5 bg-[#dbe7fe] rounded-[3px] px-2 py-1">
              <span className="text-[11px] font-medium text-[#264dc2]">Avant :</span>
              <span className="text-[11px] text-[#1e3a8a]">{oldVal ?? 'vide'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Category badge ──────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const map = {
    modification: { label: 'Modification', class: 'bg-[#e6eeff] text-[#264dc2] border-[#c5d6fb]' },
    photo_upload: { label: 'Photo', class: 'bg-[#e6f4ea] text-[#0f7a3a] border-[#bfe3cb]' },
    comment: { label: 'Commentaire', class: 'bg-[#eeeeec] text-[#666660] border-[#e5e5e2]' },
  }
  const cfg = map[category] || { label: category, class: 'bg-[#eeeeec] text-[#8a8a84] border-[#e5e5e2]' }
  return (
    <span className={clsx('text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-[2px] border', GeistMono.className, cfg.class)}>
      {cfg.label}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Timeline({ pin, newComment, refreshKey }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    if (pin) getTimeline(pin.id)
  }, [pin])

  useEffect(() => {
    if (refreshKey > 0 && pin) getTimeline(pin.id)
  }, [refreshKey])

  useEffect(() => {
    if (!newComment) return
    setEvents((prev) => {
      if (prev.some(e => e.timelineType === 'comment' && e.id === newComment.id)) return prev
      return [...prev, { ...newComment, timelineType: 'comment' }].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )
    })
  }, [newComment])

  const getTimeline = async (pinId) => {
    setLoading(true)
    const [eventsRes, commentsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id,created_at,members(*),username,event,pins_photos(*),category,metadata')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true }),
      supabase
        .from('comments')
        .select('id,created_at,comment,username,user:members(*)')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true }),
    ])

    if (eventsRes.data && commentsRes.data) {
      const combined = [
        ...eventsRes.data.map(e => ({ ...e, timelineType: 'event' })),
        ...commentsRes.data.map(c => ({ ...c, timelineType: 'comment' })),
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setEvents(combined)
    }
    setLoading(false)
  }

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename || 'image.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const displayedItems = showAllEvents
    ? events
    : events.filter(item => !(item.timelineType === 'event' && item.category === 'modification'))

  const hiddenCount = events.length - displayedItems.length

  return (
    <div className="flex flex-col bg-[#fafaf9]">
      {/* ── Toggle bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e5e5e2]">
        <div className="flex items-center gap-2">
          {showAllEvents
            ? <Eye className="w-4 h-4 text-[#2f5ee0]" />
            : <EyeOff className="w-4 h-4 text-[#8a8a84]" />}
          <p className="text-[13px] font-medium text-[#0d0d0c]">
            {showAllEvents ? 'Tous les événements' : 'Événements principaux'}
          </p>
          {hiddenCount > 0 && !showAllEvents && (
            <span className={clsx('text-[11px] bg-[#eeeeec] text-[#8a8a84] px-2 py-0.5 rounded-[3px] font-medium', GeistMono.className)}>
              +{hiddenCount} masqués
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAllEvents(!showAllEvents)}
          className={clsx(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,94,224,0.22)]',
            showAllEvents ? 'bg-[#0d0d0c]' : 'bg-[#eeeeec]'
          )}
        >
          <span
            className={clsx(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
              showAllEvents ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className="px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-[#e5e5e2] border-t-[#0d0d0c] animate-spin" />
            <p className="text-[13px] text-[#8a8a84]">Chargement...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Clock className="w-9 h-9 text-[#d6d6d2]" />
            <p className="text-[13px] text-[#8a8a84]">Aucune activité pour le moment</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-[17px] top-0 bottom-0 w-px"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, #e5e5e2 0px, #e5e5e2 6px, transparent 6px, transparent 14px)',
                opacity: 0.8,
              }}
            />

            <div className="space-y-1 pl-10">
              {displayedItems.map((item, i) => {
                const isComment = item.timelineType === 'comment'
                const isModification = item.category === 'modification'
                const isPhoto = item.category === 'photo_upload'
                const userName = isComment ? (item.username || item.user?.name) : (item.username || item.members?.name)
                const timestamp = dayjs(item.created_at).format('D MMM YYYY à HH:mm')

                const eventLabel = isComment
                  ? 'a commenté'
                  : isPhoto
                  ? 'a ajouté une photo'
                  : item.event

                return (
                  <div
                    key={`${item.timelineType}-${item.id}`}
                    className="relative pb-6"
                  >
                    {/* Avatar on the left rail */}
                    <div className="absolute -left-10 top-0">
                      <Avatar name={userName} />
                    </div>

                    {/* Card */}
                    <div className={clsx(
                      'rounded-[4px] border transition-colors',
                      isModification
                        ? 'bg-[#eff5ff] border-[#c5d6fb]'
                        : 'bg-white border-[#e5e5e2]'
                    )}>
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-[13px] font-medium text-[#0d0d0c] leading-tight">
                              {userName || 'Utilisateur inconnu'}
                            </span>
                            <span className="text-[13px] text-[#8a8a84] leading-tight">
                              {eventLabel}
                            </span>
                          </div>
                          <p className={clsx('text-[11px] text-[#b8b8b3] mt-0.5', GeistMono.className)}>
                            {timestamp}
                          </p>
                        </div>
                        <CategoryBadge category={isComment ? 'comment' : item.category} />
                      </div>

                      {/* Comment body */}
                      {isComment && item.comment && (
                        <div className="px-3.5 pb-3">
                          <p className="text-[13px] text-[#0d0d0c] leading-relaxed bg-[#f5f5f4] rounded-[4px] px-3 py-2.5">
                            {item.comment}
                          </p>
                        </div>
                      )}

                      {/* Modification diff */}
                      {isModification && (
                        <div className="px-3.5 pb-3">
                          <ModificationDiff metadata={item.metadata} />
                        </div>
                      )}

                      {/* Photo */}
                      {!isComment && item.pins_photos?.public_url && (
                        <div className="px-3.5 pb-3">
                          <div
                            className="relative w-full h-56 rounded-[4px] overflow-hidden cursor-pointer group border border-[#e5e5e2]"
                            onClick={() => setSelectedImage({
                              url: item.pins_photos.public_url,
                              event: item.event,
                              userName,
                              timestamp,
                              description: item.pins_photos?.description,
                            })}
                          >
                            <Image
                              src={item.pins_photos.public_url}
                              alt="event photo"
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-[#0d0d0c] text-[12px] font-medium px-3 py-1.5 rounded-[3px] shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
                                Agrandir
                              </span>
                            </div>
                            {item.pins_photos.description && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                                <p className="text-white text-[12px] line-clamp-2">
                                  {item.pins_photos.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Image modal ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-[6px] overflow-hidden shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent z-10 px-5 pt-4 pb-10">
              <div className="flex items-start justify-between gap-4">
                <div className="text-white min-w-0">
                  <h3 className="font-medium text-[15px] leading-tight truncate">
                    {selectedImage.event}
                  </h3>
                  <p className="text-[13px] text-white/70 mt-0.5">{selectedImage.userName}</p>
                  <p className={clsx('text-[11px] text-white/50 mt-1', GeistMono.className)}>{selectedImage.timestamp}</p>
                  {selectedImage.description && (
                    <p className="text-[11px] text-white/80 mt-2 bg-white/10 rounded-[3px] px-2 py-1 backdrop-blur-sm max-w-xs">
                      {selectedImage.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(selectedImage.url, `photo-${Date.now()}.jpg`)}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-[4px] transition-colors backdrop-blur-sm"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => window.open(selectedImage.url, '_blank')}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-[4px] transition-colors backdrop-blur-sm"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-[4px] transition-colors backdrop-blur-sm"
                    title="Fermer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="relative w-full h-[80vh]">
              <Image
                src={selectedImage.url}
                alt={selectedImage.event || 'photo'}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}