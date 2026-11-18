'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchEntreprises, fetchLotPins, lotStats } from '@/lib/data/lots'
import {
  ETATS,
  POINT_TYPES,
  PRESENCES,
  fetchMeeting,
  fetchMeetings,
  fetchPreviousProgress,
  fetchProjectPoints,
  fmtLongDate,
  fmtShortDate,
  pointsForMeeting,
} from '@/lib/data/meetings'

/** Compte rendu de réunion, mis en page pour l'impression A4 (« Enregistrer en PDF »). */
export default function CompteRenduPage({ params }) {
  const { organizationId, projectId, meetingId } = params
  const { organization } = useUserData(organizationId)
  const { project, categories, statuses, isReady } = useProjectData()

  const meetingQuery = useQuery({ queryKey: qk.meeting(meetingId), queryFn: () => fetchMeeting(meetingId) })
  const meeting = meetingQuery.data
  const meetingsQuery = useQuery({ queryKey: qk.meetings(projectId), queryFn: () => fetchMeetings(projectId) })
  const pointsQuery = useQuery({ queryKey: qk.meetingPoints(projectId), queryFn: () => fetchProjectPoints(projectId) })
  const entreprisesQuery = useQuery({ queryKey: qk.entreprises(organizationId), queryFn: () => fetchEntreprises(organizationId) })
  const pinsQuery = useQuery({ queryKey: qk.lotPins(projectId), queryFn: () => fetchLotPins(projectId) })
  const prevQuery = useQuery({
    queryKey: [...qk.meeting(meetingId), 'previous-progress'],
    queryFn: () => fetchPreviousProgress(projectId, meeting.numero),
    enabled: Boolean(meeting),
  })

  const entreprises = entreprisesQuery.data ?? []
  const entrepriseName = (id) => entreprises.find((e) => e.id === id)?.name
  const lots = useMemo(() => categories.filter((c) => c.icon !== 'unassigned'), [categories])
  const reserves = useMemo(() => (pinsQuery.data && isReady ? lotStats(pinsQuery.data, statuses) : {}), [pinsQuery.data, statuses, isReady])
  const numeroOf = (id) => meetingsQuery.data?.find((m) => m.id === id)?.numero

  const points = useMemo(() => (meeting && pointsQuery.data ? pointsForMeeting(pointsQuery.data, meeting) : []), [meeting, pointsQuery.data])
  const groups = useMemo(() => {
    const ids = new Set(lots.map((l) => l.id))
    const general = points.filter((p) => !ids.has(p.lot_id))
    return [
      { key: 'general', title: 'Généralités', items: general },
      ...lots.map((l) => ({ key: l.id, title: l.name, entreprise: entrepriseName(l.entreprise_id), items: points.filter((p) => p.lot_id === l.id) })),
    ].filter((g) => g.items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, lots, entreprises])

  const ready = meeting && project && !pointsQuery.isPending && !meetingsQuery.isPending && !entreprisesQuery.isPending
  const back = `/${organizationId}/projects/${projectId}/reunions/${meetingId}`
  const isDraft = meeting?.statut === 'brouillon'

  if (meetingQuery.isError) {
    return (
      <div className={clsx(GeistSans.className, 'min-h-screen bg-papier flex items-center justify-center')}>
        <Link href={`/${organizationId}/projects/${projectId}/reunions`} className="text-[14px] underline">Retour aux réunions</Link>
      </div>
    )
  }

  return (
    <div className={clsx(GeistSans.className, 'cr-root min-h-screen bg-voile print:bg-white')}>
      <style>{`
        @page { size: A4; margin: 14mm 12mm 16mm; }
        @media print {
          html, body { background: #fff !important; }
          .cr-root { min-height: 0 !important; background: #fff !important; }
          .cr-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
          .cr-avoid { break-inside: avoid; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      {/* Barre d'outils (non imprimée) */}
      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-filet">
        <div className="max-w-[860px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={back} className="inline-flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Réunion
          </Link>
          {isDraft && <span className="text-[13px] text-tirage">Aperçu : la réunion n&apos;est pas encore diffusée.</span>}
          <button
            onClick={() => window.print()}
            disabled={!ready}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-encre text-white text-[14px] font-medium hover:bg-encre-survol disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>
        </div>
      </div>

      {!ready ? (
        <div className="max-w-[794px] mx-auto my-8 h-[1000px] bg-white border border-filet animate-pulse" />
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
        <article className="cr-sheet relative min-w-[680px] max-w-[794px] mx-auto my-8 bg-white border border-filet shadow-carte px-12 py-10 text-[12px] leading-[1.45] text-encre">
          {isDraft && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-start justify-center pt-[300px] overflow-hidden print:fixed">
              <span className="text-[96px] font-bold tracking-widest -rotate-[24deg] select-none" style={{ color: 'rgba(15, 23, 42, 0.05)' }}>BROUILLON</span>
            </div>
          )}

          <div className="relative z-[1]">
          {/* En-tête */}
          <header className="relative flex items-start justify-between gap-6 pb-5 border-b-2 border-encre">
            <div className="flex items-center gap-3 min-w-0">
              {organization?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={organization.logo_url} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{organization?.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.08em] text-mine">Compte rendu n° {meeting.numero}</p>
              <h1 className="text-[18px] font-semibold tracking-[-0.01em] leading-tight">{meeting.objet}</h1>
              <p className="text-mine first-letter:uppercase">
                {fmtLongDate(meeting.date)}{meeting.heure ? ` à ${meeting.heure.slice(0, 5).replace(':', 'h')}` : ''}
              </p>
            </div>
          </header>

          <div className="relative grid grid-cols-[1fr_auto] gap-6 py-4 border-b border-filet">
            <div>
              <p className="text-[15px] font-semibold">{project.name}</p>
              {project.address && <p className="text-mine">{project.address}</p>}
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-right">
              {meeting.lieu && (<><dt className="text-mine">Lieu</dt><dd>{meeting.lieu}</dd></>)}
              {meeting.created_by_member?.name && (<><dt className="text-mine">Rédigé par</dt><dd>{meeting.created_by_member.name}</dd></>)}
              {meeting.diffusee_at && (<><dt className="text-mine">Diffusé le</dt><dd className="tabular-nums">{new Date(meeting.diffusee_at).toLocaleDateString('fr-FR')}</dd></>)}
            </dl>
          </div>

          {/* 1. Présents */}
          <CrSection n={1} title="Participants">
            {meeting.meeting_attendees.length === 0 ? (
              <p className="text-mine">Aucun participant renseigné.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-mine">
                    <Th>Société</Th><Th>Représentant</Th><Th className="w-24 text-center">Présence</Th>
                  </tr>
                </thead>
                <tbody>
                  {meeting.meeting_attendees.map((a) => (
                    <tr key={a.id} className="border-t border-voile">
                      <Td className="font-medium">{a.societe ?? '—'}</Td>
                      <Td>{a.nom ?? ''}</Td>
                      <Td className={clsx('text-center', a.presence !== 'present' && 'text-alerte')}>{PRESENCES[a.presence]}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CrSection>

          {/* 2. Observations */}
          {meeting.observations && (
            <CrSection n={2} title="Observations générales">
              <p className="whitespace-pre-line">{meeting.observations}</p>
            </CrSection>
          )}

          {/* 3. Avancement */}
          <CrSection n={meeting.observations ? 3 : 2} title="Avancement des travaux">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-mine">
                  <Th>Lot</Th><Th>Entreprise</Th>
                  <Th className="w-[60px] text-right">Préc.</Th><Th className="w-[60px] text-right">Ce jour</Th>
                  <Th className="w-[64px] text-right">Réserves</Th><Th>Commentaire</Th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const row = meeting.meeting_lot_progress.find((p) => p.lot_id === lot.id)
                  const value = row?.avancement ?? lot.avancement ?? 0
                  const prev = prevQuery.data?.[lot.id]
                  return (
                    <tr key={lot.id} className="border-t border-voile align-top">
                      <Td className="font-medium">{lot.name}</Td>
                      <Td>{entrepriseName(lot.entreprise_id) ?? '—'}</Td>
                      <Td className="text-right tabular-nums text-mine">{prev == null ? '—' : `${prev} %`}</Td>
                      <Td className="text-right tabular-nums font-semibold">{value} %</Td>
                      <Td className="text-right tabular-nums">{reserves[lot.id]?.open ?? 0}</Td>
                      <Td>{row?.commentaire ?? ''}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-1.5 text-[11px] text-mine">Réserves : nombre de réserves non levées sur le lot à la date d&apos;édition.</p>
          </CrSection>

          {/* 4. Points */}
          <CrSection n={meeting.observations ? 4 : 3} title="Points à suivre">
            {groups.length === 0 ? (
              <p className="text-mine">Aucun point.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-mine">
                    <Th className="w-8">N°</Th><Th className="w-6">T.</Th><Th>Libellé et suivi</Th>
                    <Th className="w-[120px]">Responsable</Th><Th className="w-[72px]">Échéance</Th><Th className="w-[58px]">État</Th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key} className={g.items.length <= 8 ? 'cr-avoid' : undefined}>
                    <tr className="cr-avoid">
                      <td colSpan={6} className="pt-3 pb-1 text-[12px] font-semibold border-b border-encre">
                        {g.title}{g.entreprise ? <span className="font-normal text-mine"> · {g.entreprise}</span> : null}
                      </td>
                    </tr>
                    {g.items.map((p) => {
                      const late = p.etat !== 'solde' && p.echeance && p.echeance < meeting.date
                      const history = [...p.historique]
                        .map((h) => ({ ...h, numero: numeroOf(h.meeting_id) }))
                        .filter((h) => h.numero && h.numero < meeting.numero)
                        .sort((a, b) => a.numero - b.numero)
                      return (
                        <tr key={p.id} className="border-b border-voile align-top">
                          <Td className="tabular-nums font-medium">{p.numero}</Td>
                          <Td title={POINT_TYPES[p.type]?.label}>{POINT_TYPES[p.type]?.short}</Td>
                          <Td>
                            <p className={clsx('whitespace-pre-line', p.etat === 'solde' && 'text-mine')}>{p.texte}</p>
                            {history.map((h) => (
                              <p key={h.meeting_id} className="text-mine">CR {h.numero} : {h.texte}</p>
                            ))}
                            {p.suivi && <p className="font-medium">CR {meeting.numero} : {p.suivi}</p>}
                            {p.etat !== 'nouveau' && p.ouverture && <p className="text-[10px] text-mine">Ouvert en réunion n° {p.ouverture.numero}</p>}
                          </Td>
                          <Td>{entrepriseName(p.entreprise_id) ?? '—'}</Td>
                          <Td className={clsx('tabular-nums', late && 'text-alerte font-medium')}>{p.echeance ? fmtShortDate(p.echeance) : '—'}</Td>
                          <Td className={clsx(p.etat === 'solde' && 'text-valide', p.etat === 'nouveau' && 'text-tirage')}>{ETATS[p.etat].label}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                ))}
              </table>
            )}
            <p className="mt-1.5 text-[11px] text-mine">T. : A = action, D = décision, I = information. Les points non soldés sont repris à la réunion suivante.</p>
          </CrSection>

          {/* Prochaine réunion */}
          <div className="cr-avoid mt-6 rounded-[6px] border border-encre px-4 py-3 flex items-center justify-between gap-4">
            <p className="font-semibold">Prochaine réunion</p>
            <p className="first-letter:uppercase">
              {meeting.prochaine_date
                ? `${fmtLongDate(meeting.prochaine_date)}${meeting.prochaine_heure ? ` à ${meeting.prochaine_heure.slice(0, 5).replace(':', 'h')}` : ''}${meeting.lieu ? ` · ${meeting.lieu}` : ''}`
                : 'Date à fixer'}
            </p>
          </div>

          <p className="mt-5 text-[11px] text-mine leading-relaxed">
            Le présent compte rendu est réputé accepté par l&apos;ensemble des participants à défaut d&apos;observations
            écrites adressées au rédacteur dans un délai de huit jours suivant sa diffusion.
          </p>
          </div>
        </article>
        </div>
      )}
    </div>
  )
}

function CrSection({ n, title, children }) {
  return (
    <section className="relative mt-6">
      <h2 className="cr-avoid text-[13px] font-semibold uppercase tracking-[0.06em] mb-2">
        <span className="text-mine tabular-nums">{n}.</span> {title}
      </h2>
      {children}
    </section>
  )
}

function Th({ children, className }) {
  return <th className={clsx('py-1.5 pr-3 font-medium text-[11px] border-b border-filet', className)}>{children}</th>
}

function Td({ children, className, title }) {
  return <td title={title} className={clsx('py-1.5 pr-3', className)}>{children}</td>
}
