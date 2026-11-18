'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, FileText, MapPin, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import NavBar from '@/components/NavBar'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchEntreprises, todayISO } from '@/lib/data/lots'
import { createMeeting, fetchMeetings, fetchProjectPoints, fmtLongDate, fmtShortDate } from '@/lib/data/meetings'

export default function ReunionsPage({ params }) {
  const { organizationId, projectId } = params
  const router = useRouter()
  const queryClient = useQueryClient()
  const { profile, isAdmin } = useUserData(organizationId)
  const { project, categories } = useProjectData()
  const canEdit = profile && profile.role !== 'guest'
  const [creating, setCreating] = useState(false)

  const meetingsQuery = useQuery({ queryKey: qk.meetings(projectId), queryFn: () => fetchMeetings(projectId) })
  const pointsQuery = useQuery({ queryKey: qk.meetingPoints(projectId), queryFn: () => fetchProjectPoints(projectId) })
  const entreprisesQuery = useQuery({ queryKey: qk.entreprises(organizationId), queryFn: () => fetchEntreprises(organizationId) })

  const meetings = meetingsQuery.data ?? []
  const points = pointsQuery.data ?? []
  const draft = meetings.find((m) => m.statut === 'brouillon')

  // Bilan des points par réunion : ouverts lors de la réunion, soldés lors de la réunion.
  const perMeeting = useMemo(() => {
    const out = {}
    for (const p of points) {
      if (p.ouverture) (out[p.ouverture.id] ??= { nouveaux: 0, soldes: 0 }).nouveaux++
      if (p.cloture) (out[p.cloture.id] ??= { nouveaux: 0, soldes: 0 }).soldes++
    }
    return out
  }, [points])

  const open = points.filter((p) => p.statut === 'ouvert')
  const today = todayISO()
  const overdue = open.filter((p) => p.echeance && p.echeance < today).sort((a, b) => a.echeance.localeCompare(b.echeance))
  const lotName = (id) => categories.find((c) => c.id === id)?.name
  const entrepriseName = (id) => entreprisesQuery.data?.find((e) => e.id === id)?.name

  const openByLot = useMemo(() => {
    const out = new Map()
    for (const p of open) {
      const key = p.lot_id ?? 'general'
      out.set(key, (out.get(key) ?? 0) + 1)
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1])
  }, [open])

  const startMeeting = async () => {
    if (draft) return router.push(`/${organizationId}/projects/${projectId}/reunions/${draft.id}`)
    setCreating(true)
    try {
      const id = await createMeeting(projectId)
      await queryClient.invalidateQueries({ queryKey: qk.meetings(projectId) })
      router.push(`/${organizationId}/projects/${projectId}/reunions/${id}`)
    } catch (err) {
      console.error('Création de réunion', err)
      alert('Impossible de créer la réunion.')
      setCreating(false)
    }
  }

  const loading = meetingsQuery.isPending

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-8 pt-6 pb-10 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Réunions de chantier</h1>
            <p className="text-[13px] text-mine-clair mt-0.5 tabular-nums">
              {loading ? (
                <span className="inline-block h-3 w-24 bg-voile rounded-[6px] animate-pulse align-middle" />
              ) : meetings.length ? (
                `${meetings.length} réunion${meetings.length > 1 ? 's' : ''} · ${open.length} point${open.length > 1 ? 's' : ''} à suivre`
              ) : (
                'Comptes rendus, présents, avancement des lots et points à suivre'
              )}
            </p>
          </div>
          {canEdit && !loading && (
            <button
              onClick={startMeeting}
              disabled={creating}
              className="bg-encre text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {draft ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {draft ? `Reprendre la réunion n° ${draft.numero}` : creating ? 'Préparation…' : 'Nouvelle réunion'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-[12px] border border-filet shadow-carte divide-y divide-voile">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="h-4 w-10 rounded-[4px] bg-voile animate-pulse" />
                <div className="h-4 w-64 rounded-[4px] bg-voile animate-pulse" />
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white border border-filet rounded-[12px] p-12 text-center shadow-carte max-w-2xl mx-auto">
            <Users className="w-10 h-10 text-filet-fort mx-auto mb-4" />
            <p className="text-[15px] font-medium text-encre mb-1.5">Aucune réunion pour l&apos;instant</p>
            <p className="text-[14px] text-mine-clair mb-6 max-w-md mx-auto leading-relaxed">
              Préparez la réunion de chantier ici : les entreprises des lots sont convoquées, l&apos;avancement
              de chaque lot est repris, et les points non soldés passent d&apos;une réunion à la suivante.
            </p>
            {canEdit && (
              <button
                onClick={startMeeting}
                disabled={creating}
                className="px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {creating ? 'Préparation…' : 'Préparer la première réunion'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="bg-white rounded-[12px] border border-filet shadow-carte overflow-hidden">
              <ul className="divide-y divide-voile">
                {meetings.map((m) => {
                  const stats = perMeeting[m.id] ?? { nouveaux: 0, soldes: 0 }
                  const isDraft = m.statut === 'brouillon'
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/${organizationId}/projects/${projectId}/reunions/${m.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-survol transition-colors"
                      >
                        <div className="w-12 h-12 rounded-[8px] border border-filet bg-papier flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] uppercase tracking-wide text-mine-clair leading-none">N°</span>
                          <span className="text-[17px] font-semibold text-encre tabular-nums leading-tight">{m.numero}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-medium text-encre first-letter:uppercase">{fmtLongDate(m.date)}</p>
                            {isDraft ? (
                              <span className="px-2 py-0.5 rounded-full bg-tirage-pale text-tirage text-[12px] font-medium">Brouillon</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-voile text-mine text-[12px]">
                                Diffusée{m.diffusee_at ? ` le ${new Date(m.diffusee_at).toLocaleDateString('fr-FR')}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[13px] text-mine-clair flex-wrap">
                            {m.lieu && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{m.lieu}</span>}
                            <span className="tabular-nums">{stats.nouveaux} nouveau{stats.nouveaux > 1 ? 'x' : ''} point{stats.nouveaux > 1 ? 's' : ''} · {stats.soldes} soldé{stats.soldes > 1 ? 's' : ''}</span>
                            {m.prochaine_date && (
                              <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Suivante : {fmtShortDate(m.prochaine_date)}</span>
                            )}
                          </div>
                        </div>
                        {!isDraft && (
                          <span
                            role="link"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault()
                              router.push(`/${organizationId}/projects/${projectId}/reunions/${m.id}/compte-rendu`)
                            }}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-filet text-[13px] font-medium text-mine hover:bg-white hover:text-encre"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Compte rendu
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-mine-clair flex-shrink-0" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <aside className="space-y-6">
              <section className="bg-white border border-filet rounded-[12px] shadow-carte">
                <div className="px-5 py-4 border-b border-voile">
                  <h2 className="text-[15px] font-medium text-encre">Points à suivre</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[12px] text-mine-clair">Ouverts</p>
                      <p className="text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums text-encre">{open.length}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-mine-clair">Échéance dépassée</p>
                      <p className={clsx('text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums', overdue.length ? 'text-alerte' : 'text-encre')}>{overdue.length}</p>
                    </div>
                  </div>
                  {openByLot.length > 0 && (
                    <ul className="space-y-1.5">
                      {openByLot.map(([lotId, n]) => (
                        <li key={lotId} className="flex items-center justify-between text-[13px]">
                          <span className="text-mine truncate">{lotId === 'general' ? 'Généralités' : lotName(lotId) ?? 'Lot supprimé'}</span>
                          <span className="text-encre tabular-nums">{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {overdue.length > 0 && (
                <section className="bg-white border border-filet rounded-[12px] shadow-carte">
                  <div className="px-5 py-4 border-b border-voile">
                    <h2 className="text-[15px] font-medium text-encre">En retard</h2>
                  </div>
                  <ul className="divide-y divide-voile">
                    {overdue.slice(0, 6).map((p) => (
                      <li key={p.id} className="px-5 py-3">
                        <p className="text-[13px] text-encre line-clamp-2">
                          <span className="text-mine-clair tabular-nums">{p.numero}. </span>{p.texte}
                        </p>
                        <p className="text-[12px] text-mine-clair mt-0.5">
                          {entrepriseName(p.entreprise_id) ?? 'Sans responsable'} · <span className="text-alerte tabular-nums">{fmtShortDate(p.echeance)}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
