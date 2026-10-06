'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, X, Image as ImageIcon, Download } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import clsx from 'clsx'
import dayjs from 'dayjs'

import NavBar from '@/components/NavBar'
import GroupedMediaGallery from '@/components/GroupedMediaGallery'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import { usePinScope } from '@/hooks/usePins'
import { useUrlParams } from '@/hooks/useUrlParams'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchMediasPage } from '@/lib/data/medias'
import { BACKEND_URL } from '@/lib/config'

const toDate = (value) => (value ? dayjs(value).toDate() : null)
const toParam = (date) => (date ? dayjs(date).format('YYYY-MM-DD') : null)

export default function Medias({ params }) {
  const { projectId, organizationId } = params
  const { profile, isAdmin } = useUserData(organizationId)
  const { project, plans } = useProjectData()
  const scope = usePinScope()

  // ── Filtres : dans l'URL, appliqués dans la requête ──────────────────────
  const [searchParams, setParams] = useUrlParams()
  const planId = searchParams.get('plan') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const filters = useMemo(() => ({ planId, from, to }), [planId, from, to])
  const hasActiveFilters = Boolean(planId || from || to)
  const clearFilters = () => setParams({ plan: null, from: null, to: null })

  // Le sélecteur de période garde son état pendant la saisie (début sans fin).
  const [range, setRange] = useState([toDate(from), toDate(to)])
  useEffect(() => setRange([toDate(from), toDate(to)]), [from, to])

  const {
    data, isPending, isError, isPlaceholderData,
    hasNextPage, isFetchingNextPage, fetchNextPage, refetch,
  } = useInfiniteQuery({
    queryKey: qk.medias(projectId, scope, filters),
    queryFn: ({ pageParam }) => fetchMediasPage({ projectId, filters, scope, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(projectId && scope.profileId),
    placeholderData: keepPreviousData,
  })

  const medias = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data])
  const total = data?.pages[0]?.count ?? medias.length

  const sentinelRef = useRef(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ── Sélection et rapport ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  useEffect(() => setSelectedIds(new Set()), [filters, projectId])

  const handleDownload = async () => {
    if (isDownloading || selectedIds.size === 0) return
    setIsDownloading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnectez-vous')

      const query = new URLSearchParams({ projectId, selectedIds: Array.from(selectedIds).join(',') })
      const response = await fetch(`${BACKEND_URL}/api/mediareport?${query}`, {
        headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`Erreur API ${response.status}`)

      // Le backend dépose le PDF dans le stockage et renvoie une URL signée.
      const { downloadUrl, fileName } = await response.json()
      if (!downloadUrl) throw new Error('URL de téléchargement manquante')

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName || 'rapport-medias.pdf'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert(error.message || 'Impossible de générer le rapport')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-[#fafaf9]')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-8 pt-6 pb-10 max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Médiathèque</h1>
            {isPending ? (
              <div className="h-3 w-24 bg-[#eeeeec] rounded-[3px] animate-pulse" />
            ) : (
              <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
                {total} photo{total > 1 ? 's' : ''}
                {hasActiveFilters ? ' pour ces filtres' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="rounded-[4px] border border-[#e5e5e2] bg-white px-3 py-[7px] text-[13px] text-[#4a4a46] font-medium focus:outline-none focus:border-[#0d0d0c] transition-colors cursor-pointer"
              value={planId}
              onChange={(e) => setParams({ plan: e.target.value })}
            >
              <option value="">Tous les plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="relative">
              <DatePicker
                selectsRange
                startDate={range[0]}
                endDate={range[1]}
                onChange={([start, end]) => {
                  setRange([start, end])
                  // On n'interroge le serveur qu'une fois la période complète (ou effacée).
                  if ((start && end) || (!start && !end)) setParams({ from: toParam(start), to: toParam(end) })
                }}
                isClearable
                placeholderText="Période"
                className="rounded-[4px] border border-[#e5e5e2] bg-white pl-8 pr-3 py-[7px] text-[13px] text-[#4a4a46] font-medium focus:outline-none focus:border-[#0d0d0c] transition-colors w-48"
                dateFormat="dd/MM/yyyy"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a8a84] pointer-events-none" />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-[7px] text-[13px] font-medium text-[#8a8a84] hover:text-[#0d0d0c] border border-[#e5e5e2] bg-white rounded-[4px] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e2] rounded-[4px] overflow-hidden">
          {(hasActiveFilters || selectedIds.size > 0) && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f5f5f4] border-b border-[#e5e5e2]">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedIds.size > 0 && (
                  <p className="text-[12px] font-medium text-[#050505]">
                    {selectedIds.size} photo{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                  </p>
                )}
                {planId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#e5e5e2] rounded-[3px] text-[11px] font-medium text-[#4a4a46]">
                    {plans.find((p) => p.id === planId)?.name ?? 'Plan'}
                    <button onClick={() => setParams({ plan: null })} className="text-[#b8b8b3] hover:text-[#0d0d0c] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(from || to) && (
                  <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#e5e5e2] rounded-[3px] text-[11px] font-medium text-[#4a4a46]', GeistMono.className)}>
                    {toDate(from)?.toLocaleDateString('fr-FR')} – {toDate(to)?.toLocaleDateString('fr-FR') || 'Maintenant'}
                    <button onClick={() => setParams({ from: null, to: null })} className="text-[#b8b8b3] hover:text-[#0d0d0c] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d0c] text-white rounded-[4px] text-[12px] font-medium hover:bg-[#1a1a18] disabled:opacity-60 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloading ? 'Génération…' : 'Rapport PDF'}
                </button>
              )}
            </div>
          )}

          {isPending ? (
            <div className="p-5 grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-square bg-[#eeeeec] rounded-[4px]" />
                  <div className="h-2.5 bg-[#eeeeec] rounded-[3px] mt-2 w-2/3" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-[13px] text-[#9c1b1b] mb-3">Impossible de charger les photos.</p>
              <button
                onClick={() => refetch()}
                className="px-3 py-1.5 text-[12px] font-medium border border-[#e5e5e2] rounded-[4px] hover:bg-[#f5f5f4] transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className={clsx('p-5 transition-opacity', isPlaceholderData && 'opacity-60')}>
              {medias.length === 0 ? (
                <div className="py-16 text-center">
                  <ImageIcon className="w-10 h-10 text-[#eeeeec] mx-auto mb-3" />
                  <p className="text-[13px] text-[#8a8a84]">
                    {hasActiveFilters ? 'Aucun résultat pour ces filtres' : 'Aucune photo à afficher'}
                  </p>
                </div>
              ) : (
                <GroupedMediaGallery media={medias} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
              )}

              {hasNextPage && (
                <div ref={sentinelRef} className="flex justify-center pt-8">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className={clsx('text-[12px] text-[#666660] hover:text-[#0d0d0c] disabled:opacity-50 transition-colors', GeistMono.className)}
                  >
                    {isFetchingNextPage ? 'Chargement…' : `Charger plus (${medias.length} sur ${total})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
