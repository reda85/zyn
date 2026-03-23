import { supabase } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import dayjs from "dayjs"
import 'dayjs/locale/fr'
import { Clock, X, Download, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react"

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
const AVATAR_COLORS = [
  '#ef4444','#ec4899','#a855f7','#6366f1',
  '#3b82f6','#06b6d4','#14b8a6','#f97316',
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
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
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
      ? <span className="italic text-muted-foreground">vide</span>
      : <span className="font-semibold">"{String(val)}"</span>

  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-2">
      {changes.map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="space-y-1">
          <p className="text-xs text-blue-700">
            A modifié <span className="font-medium">{FIELD_LABELS[field] || field}</span> → {formatVal(newVal)}
          </p>
          <button
            onClick={() => toggle(field)}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-600 transition-colors"
          >
            {expanded[field]
              ? <><ChevronUp className="w-3 h-3" /> Masquer</>
              : <><ChevronDown className="w-3 h-3" /> Valeur précédente</>}
          </button>
          {expanded[field] && (
            <div className="flex items-center gap-1.5 bg-blue-100/60 rounded px-2 py-1">
              <span className="text-[11px] font-semibold text-blue-400">Avant :</span>
              <span className="text-[11px] text-blue-500">{oldVal ?? 'vide'}</span>
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
    modification: { label: 'Modification', class: 'bg-blue-50 text-blue-600 border-blue-100' },
    photo_upload: { label: 'Photo', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    comment: { label: 'Commentaire', class: 'bg-slate-100 text-slate-500 border-slate-200' },
  }
  const cfg = map[category] || { label: category, class: 'bg-secondary text-muted-foreground border-border' }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.class}`}>
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
        .select('id,created_at,members(*),event,pins_photos(*),category,metadata')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true }),
      supabase
        .from('comments')
        .select('id,created_at,comment,user:members(*)')
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

  // Filter: when showAllEvents is false, hide modification events
  const displayedItems = showAllEvents
    ? events
    : events.filter(item => !(item.timelineType === 'event' && item.category === 'modification'))

  const hiddenCount = events.length - displayedItems.length

  return (
    <div className="flex flex-col bg-secondary/10">
      {/* ── Toggle bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border/50">
        <div className="flex items-center gap-2">
          {showAllEvents
            ? <Eye className="w-4 h-4 text-primary" />
            : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          <p className="text-sm font-medium text-foreground">
            {showAllEvents ? 'Tous les événements' : 'Événements principaux'}
          </p>
          {hiddenCount > 0 && !showAllEvents && (
            <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              +{hiddenCount} masqués
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAllEvents(!showAllEvents)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            showAllEvents ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              showAllEvents ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className="px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Clock className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucune activité pour le moment</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-[17px] top-0 bottom-0 w-px"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, hsl(var(--border)) 0px, hsl(var(--border)) 6px, transparent 6px, transparent 14px)',
                opacity: 0.6,
              }}
            />

            <div className="space-y-1 pl-10">
              {displayedItems.map((item, i) => {
                const isComment = item.timelineType === 'comment'
                const isModification = item.category === 'modification'
                const isPhoto = item.category === 'photo_upload'
                const userName = isComment ? item.user?.name : item.members?.name
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
                    <div className={`rounded-xl border transition-all ${
                      isComment
                        ? 'bg-background border-border/60'
                        : isModification
                        ? 'bg-blue-50/50 border-blue-100'
                        : 'bg-background border-border/60'
                    }`}>
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground leading-tight">
                              {userName || 'Utilisateur inconnu'}
                            </span>
                            <span className="text-sm text-muted-foreground leading-tight">
                              {eventLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {timestamp}
                          </p>
                        </div>
                        <CategoryBadge category={isComment ? 'comment' : item.category} />
                      </div>

                      {/* Comment body */}
                      {isComment && item.comment && (
                        <div className="px-3.5 pb-3">
                          <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg px-3 py-2.5">
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
                            className="relative w-full h-56 rounded-lg overflow-hidden cursor-pointer group border border-border/30"
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
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow">
                                Agrandir
                              </span>
                            </div>
                            {item.pins_photos.description && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                                <p className="text-white text-xs line-clamp-2">
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
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent z-10 px-5 pt-4 pb-10">
              <div className="flex items-start justify-between gap-4">
                <div className="text-white min-w-0">
                  <h3 className="font-semibold text-base leading-tight truncate">
                    {selectedImage.event}
                  </h3>
                  <p className="text-sm text-white/70 mt-0.5">{selectedImage.userName}</p>
                  <p className="text-xs text-white/50 mt-1">{selectedImage.timestamp}</p>
                  {selectedImage.description && (
                    <p className="text-xs text-white/80 mt-2 bg-white/10 rounded px-2 py-1 backdrop-blur-sm max-w-xs">
                      {selectedImage.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(selectedImage.url, `photo-${Date.now()}.jpg`)}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-lg transition-colors backdrop-blur-sm"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => window.open(selectedImage.url, '_blank')}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-lg transition-colors backdrop-blur-sm"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-lg transition-colors backdrop-blur-sm"
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