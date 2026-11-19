'use client'

// Cloche des notifications : pastille du nombre de non lues, panneau des
// dernières notifications, ouverture de l'élément concerné. Mise à jour en
// direct (Supabase Realtime) et, à défaut, toutes les minutes.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlarmClock, AlertTriangle, BellIcon, Camera, CheckCheck, CircleDot, FileBarChart2,
  FileText, MessageSquare, UserPlus, Users,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/utils/supabase/client'
import { qk } from '@/lib/data/keys'
import {
  fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationsRead,
  notificationHref, relativeTime,
} from '@/lib/data/notifications'

const ICONS = {
  assigned: [UserPlus, 'text-tirage bg-tirage-pale'],
  status: [CircleDot, 'text-mine bg-voile'],
  comment: [MessageSquare, 'text-mine bg-voile'],
  photo: [Camera, 'text-mine bg-voile'],
  due_soon: [AlarmClock, 'text-tirage bg-tirage-pale'],
  overdue: [AlertTriangle, 'text-alerte bg-alerte-pale'],
  meeting: [Users, 'text-valide bg-valide-pale'],
  document: [FileText, 'text-mine bg-voile'],
  report: [FileBarChart2, 'text-mine bg-voile'],
}

export default function NotificationBell({ organizationId, memberId, variant = 'icon' }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const ref = useRef(null)

  const unreadQuery = useQuery({
    queryKey: qk.notificationsUnread(),
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    enabled: Boolean(memberId),
  })
  const listQuery = useQuery({
    queryKey: qk.notifications(),
    queryFn: () => fetchNotifications(),
    enabled: Boolean(memberId) && open,
  })
  const unread = unreadQuery.data ?? 0

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.notificationsUnread() })
    queryClient.invalidateQueries({ queryKey: qk.notifications() })
  }

  // Nouvelle notification : mise à jour immédiate.
  useEffect(() => {
    if (!memberId) return
    const channel = supabase
      .channel(`notifications:${memberId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${memberId}` }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const items = (listQuery.data ?? []).filter((n) => filter === 'all' || !n.read_at)

  const openItem = async (n) => {
    setOpen(false)
    if (!n.read_at) {
      // Affichage lu tout de suite, enregistrement ensuite.
      queryClient.setQueryData(qk.notifications(), (list) => list?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      queryClient.setQueryData(qk.notificationsUnread(), (c) => Math.max(0, (c ?? 1) - 1))
      markNotificationsRead([n.id]).catch(() => {}).finally(refresh)
    }
    const href = notificationHref(n, organizationId)
    if (!href) return
    const [path, hash] = href.split('#')
    // Déjà sur la liste des tâches : le changement d'ancre ouvre l'élément.
    if (hash && window.location.pathname === path) window.location.hash = hash
    else router.push(href)
  }

  const readAll = async () => {
    queryClient.setQueryData(qk.notifications(), (list) => list?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
    queryClient.setQueryData(qk.notificationsUnread(), 0)
    try { await markAllNotificationsRead() } finally { refresh() }
  }

  const badge = unread > 0 && (
    <span className={clsx(
      'min-w-[18px] h-[18px] px-1 rounded-full bg-alerte text-white text-[11px] font-semibold leading-[18px] text-center tabular-nums',
      variant === 'icon' && 'absolute -top-1 -right-1'
    )}>
      {unread > 99 ? '99+' : unread}
    </span>
  )

  return (
    <div className="relative" ref={ref}>
      {variant === 'nav' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={clsx(
            'w-full flex text-[14px] items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] transition-colors',
            open ? 'bg-survol text-encre' : 'text-mine hover:bg-survol hover:text-encre'
          )}
        >
          <BellIcon strokeWidth={1.75} className="w-4 h-4 text-mine-clair" />
          <span className="flex-1 text-left">Notifications</span>
          {badge}
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
          className={clsx(
            'relative flex h-8 w-8 items-center justify-center rounded-[8px] text-mine hover:bg-white/70 hover:text-encre transition-colors',
            open && 'bg-white text-encre'
          )}
        >
          <BellIcon className="h-5 w-5" />
          {badge}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={clsx(
            'absolute z-50 w-[400px] max-w-[calc(100vw-24px)] rounded-[12px] border border-filet bg-white shadow-[0_2px_4px_rgba(15,15,15,0.04),0_12px_32px_-8px_rgba(15,15,15,0.14)] overflow-hidden',
            variant === 'nav' ? 'left-full top-0 ml-2' : 'right-0 top-full mt-2'
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
            <p className="text-[15px] font-medium text-encre">Notifications</p>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 p-0.5 bg-voile rounded-[7px]">
                {[['all', 'Toutes'], ['unread', 'Non lues']].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={clsx('px-2 py-0.5 rounded-[5px] text-[12px] font-medium', filter === k ? 'bg-white text-encre shadow-[0_1px_2px_rgba(15,15,15,0.08)]' : 'text-mine-clair hover:text-encre')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={readAll}
                disabled={!unread}
                title="Tout marquer comme lu"
                aria-label="Tout marquer comme lu"
                className="p-1.5 rounded-[6px] text-mine-clair hover:text-encre hover:bg-survol disabled:opacity-40"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto border-t border-voile">
            {listQuery.isPending ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-[6px] bg-voile animate-pulse" />)}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <BellIcon className="w-7 h-7 text-filet-fort mx-auto mb-2" />
                <p className="text-[14px] text-mine-clair">
                  {filter === 'unread' ? 'Tout est lu.' : 'Aucune notification pour l’instant.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-voile">
                {items.map((n) => {
                  const [Icon, tone] = ICONS[n.kind] ?? ICONS.status
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openItem(n)}
                        className={clsx('w-full flex gap-3 px-4 py-3 text-left hover:bg-survol transition-colors', !n.read_at && 'bg-papier')}
                      >
                        <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', tone)}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={clsx('block text-[14px] leading-snug', n.read_at ? 'text-mine' : 'text-encre font-medium')}>{n.title}</span>
                          {n.body && <span className="block text-[13px] text-mine-clair leading-snug mt-0.5 line-clamp-2">{n.body}</span>}
                          <span className="block text-[12px] text-mine-clair mt-1">{relativeTime(n.created_at)}</span>
                        </span>
                        {!n.read_at && <span className="w-2 h-2 rounded-full bg-tirage mt-1.5 flex-shrink-0" aria-label="Non lue" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
