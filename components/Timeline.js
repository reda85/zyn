import { supabase } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import dayjs from "dayjs"
import { Switch } from "@headlessui/react"
import { Clock } from "lucide-react"
import 'dayjs/locale/fr'

dayjs.locale('fr')

export default function Timeline({ pin, newComment }) {
  const [events, setEvents] = useState([])
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (pin) {
      getTimeline(pin.id)
    }
  }, [pin])

  const normalizeComment = (comment) => ({
    ...comment,
    timelineType: 'comment',
  })

  useEffect(() => {
    if (!newComment) return

    setEvents((prev) => {
      if (prev.some(e => e.timelineType === 'comment' && e.id === newComment.id)) {
        return prev
      }

      return [...prev, normalizeComment(newComment)].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )
    })
  }, [newComment])

  const getTimeline = async (pinId) => {
    const [eventsRes, commentsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id,created_at,members(*),event,pins_photos(*),category')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true }),
      supabase
        .from('comments')
        .select('id,created_at,comment,user:members(*)')
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true })
    ])

    if (eventsRes.data && commentsRes.data) {
      const combined = [
        ...eventsRes.data.map(e => ({ ...e, timelineType: 'event' })),
        ...commentsRes.data.map(c => ({ ...c, timelineType: 'comment' }))
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      setEvents(combined)
    }
  }

  return (
    <div className="bg-secondary/20 min-h-screen">
      <div className="flex items-center justify-between p-4 bg-secondary/40 border-b border-border/50">
        <p className="text-sm font-medium text-foreground">
          Afficher tous les événements
        </p>
        <Switch
          checked={enabled}
          onChange={setEnabled}
          className={`${enabled ? 'bg-primary' : 'bg-muted'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
          <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`} />
        </Switch>
      </div>

      <div className="relative p-6">
        <div
          className="absolute left-9 top-0 bottom-0 w-0.5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, hsl(var(--border)), hsl(var(--border)) 8px, transparent 8px, transparent 16px)',
            opacity: 0.5,
          }}
        />

        {events.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Aucune activité pour le moment
            </p>
          </div>
        )}

        {events.map((item) => {
          const timestamp = dayjs(item.created_at).format('D MMM YYYY à HH:mm')
          const userName =
            item.timelineType === 'comment'
              ? item.user?.name
              : item.members?.name
          const initial = (userName || 'U').charAt(0).toUpperCase()

          return (
            <div key={`${item.timelineType}-${item.id}`} className="relative mb-8 ml-8">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 ${
                    item.timelineType === 'comment'
                      ? 'bg-slate-800'
                      : 'bg-primary'
                  }`}
                >
                  {initial}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {userName}
                      </span>

                      {/* ✅ ALL events inline */}
                      {item.timelineType === 'event' && (
                        <span className="text-sm text-muted-foreground">
                          {item.event}
                        </span>
                      )}

                      {item.timelineType === 'comment' && (
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase text-slate-500 font-bold tracking-tighter">
                          Commentaire
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    {item.timelineType === 'comment' && (
                      <div className="mt-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-slate-700 leading-relaxed text-sm">
                        {item.comment}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                      {timestamp}
                    </div>

                    {item.pins_photos?.public_url && (
                      <div className="mt-3 relative w-full h-[240px] bg-secondary/30 rounded-lg overflow-hidden border border-border/40">
                        <Image
                          src={item.pins_photos.public_url}
                          alt="event photo"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
