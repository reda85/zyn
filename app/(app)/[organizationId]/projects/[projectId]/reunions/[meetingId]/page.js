'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Lock, Plus, RotateCcw, Send, Trash2, X } from 'lucide-react'
import { cn as clsx } from '@/lib/utils'
import { GeistSans } from 'geist/font/sans'
import NavBar from '@/components/NavBar'
import { categoriesIcons } from '@/utils/categories'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchEntreprises } from '@/lib/data/lots'
import {
  PRESENCES,
  addAttendee,
  createPoint,
  deleteAttendee,
  deleteMeeting,
  deletePoint,
  diffuseMeeting,
  fetchMeeting,
  fetchMeetings,
  fetchPreviousProgress,
  fetchProjectPoints,
  pointsForMeeting,
  reopenMeeting,
  saveProgress,
  saveSuivi,
  updateAttendee,
  updateMeeting,
  updatePoint,
} from '@/lib/data/meetings'
import { AutoField, Label, Section, Segmented, inputClass } from './fields'
import PointsSection from './PointsSection'

const PRESENCE_OPTIONS = Object.entries(PRESENCES).map(([value, label]) => ({ value, label }))

export default function MeetingPage({ params }) {
  const { organizationId, projectId, meetingId } = params
  const router = useRouter()
  const queryClient = useQueryClient()
  const { profile, isAdmin } = useUserData(organizationId)
  const { project, categories } = useProjectData()
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState(null) // 'saving' | 'saved' | 'error'

  const meetingQuery = useQuery({ queryKey: qk.meeting(meetingId), queryFn: () => fetchMeeting(meetingId) })
  const meeting = meetingQuery.data
  const meetingsQuery = useQuery({ queryKey: qk.meetings(projectId), queryFn: () => fetchMeetings(projectId) })
  const pointsQuery = useQuery({ queryKey: qk.meetingPoints(projectId), queryFn: () => fetchProjectPoints(projectId) })
  const entreprisesQuery = useQuery({ queryKey: qk.entreprises(organizationId), queryFn: () => fetchEntreprises(organizationId) })
  const prevQuery = useQuery({
    queryKey: [...qk.meeting(meetingId), 'previous-progress'],
    queryFn: () => fetchPreviousProgress(projectId, meeting.numero),
    enabled: Boolean(meeting),
  })

  const entreprises = entreprisesQuery.data ?? []
  const lots = useMemo(() => categories.filter((c) => c.icon !== 'unassigned'), [categories])
  const points = useMemo(
    () => (meeting && pointsQuery.data ? pointsForMeeting(pointsQuery.data, meeting) : []),
    [meeting, pointsQuery.data]
  )
  const numeroOf = (id) => meetingsQuery.data?.find((m) => m.id === id)?.numero
  const latest = meetingsQuery.data?.[0]

  const canEdit = profile && profile.role !== 'guest'
  const readOnly = !meeting || meeting.statut !== 'brouillon' || !canEdit
  const canReopen = isAdmin && meeting?.statut === 'diffusee' && latest?.id === meeting.id

  // ── Enregistrement ──
  const run = async (fn, { refreshMeeting = false, refreshPoints = false } = {}) => {
    setSaveState('saving')
    try {
      const result = await fn()
      if (refreshMeeting) await queryClient.invalidateQueries({ queryKey: qk.meeting(meetingId), exact: true })
      if (refreshPoints) await queryClient.invalidateQueries({ queryKey: qk.meetingPoints(projectId) })
      setSaveState('saved')
      return result
    } catch (err) {
      console.error('Réunion : enregistrement impossible', err)
      setSaveState('error')
      await queryClient.invalidateQueries({ queryKey: qk.meeting(meetingId), exact: true })
      await queryClient.invalidateQueries({ queryKey: qk.meetingPoints(projectId) })
    }
  }

  const patchMeeting = (fields) => {
    queryClient.setQueryData(qk.meeting(meetingId), (m) => (m ? { ...m, ...fields } : m))
    return run(() => updateMeeting(meetingId, fields))
  }

  const patchAttendees = (updater) =>
    queryClient.setQueryData(qk.meeting(meetingId), (m) => (m ? { ...m, meeting_attendees: updater(m.meeting_attendees) } : m))

  const patchProgress = (lotId, fields) => {
    queryClient.setQueryData(qk.meeting(meetingId), (m) => {
      if (!m) return m
      const exists = m.meeting_lot_progress.some((p) => p.lot_id === lotId)
      const rows = exists
        ? m.meeting_lot_progress.map((p) => (p.lot_id === lotId ? { ...p, ...fields } : p))
        : [...m.meeting_lot_progress, { meeting_id: meetingId, lot_id: lotId, avancement: 0, ...fields }]
      return { ...m, meeting_lot_progress: rows }
    })
    const current = meeting.meeting_lot_progress.find((p) => p.lot_id === lotId)
    const base = current ?? { avancement: lots.find((l) => l.id === lotId)?.avancement ?? 0 }
    return run(() => saveProgress(meetingId, lotId, { avancement: base.avancement, commentaire: base.commentaire ?? null, ...fields }))
  }

  const setPoint = (point) =>
    queryClient.setQueryData(qk.meetingPoints(projectId), (list = []) =>
      list.some((p) => p.id === point.id) ? list.map((p) => (p.id === point.id ? point : p)) : [...list, point]
    )

  const pointActions = {
    onCreate: (fields) =>
      run(async () => setPoint(await createPoint({ ...fields, project_id: projectId, meeting_id: meetingId }))),
    onUpdate: (id, fields) => {
      queryClient.setQueryData(qk.meetingPoints(projectId), (list = []) =>
        list.map((p) =>
          p.id === id
            ? { ...p, ...fields, ...('clos_meeting_id' in fields ? { cloture: fields.clos_meeting_id ? { id: meetingId, numero: meeting.numero, date: meeting.date } : null } : {}) }
            : p
        )
      )
      return run(async () => setPoint(await updatePoint(id, fields)))
    },
    onDelete: (id) => {
      queryClient.setQueryData(qk.meetingPoints(projectId), (list = []) => list.filter((p) => p.id !== id))
      return run(() => deletePoint(id))
    },
    onSuivi: (id, texte) => {
      queryClient.setQueryData(qk.meetingPoints(projectId), (list = []) =>
        list.map((p) => {
          if (p.id !== id) return p
          const others = (p.meeting_point_suivis ?? []).filter((s) => s.meeting_id !== meetingId)
          return { ...p, meeting_point_suivis: texte.trim() ? [...others, { meeting_id: meetingId, texte: texte.trim() }] : others }
        })
      )
      return run(() => saveSuivi(id, meetingId, texte))
    },
  }

  // ── Actions de la réunion ──
  const diffuse = async () => {
    const open = points.filter((p) => p.etat !== 'solde').length
    if (!confirm(
      `Diffuser le compte rendu de la réunion n° ${meeting.numero} ?\n\n` +
      `La réunion sera figée, l'avancement des lots sera mis à jour, et ${open} point${open > 1 ? 's' : ''} non soldé${open > 1 ? 's' : ''} ${open > 1 ? 'seront repris' : 'sera repris'} à la prochaine réunion.`
    )) return
    setBusy(true)
    try {
      await diffuseMeeting(meetingId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.meeting(meetingId) }),
        queryClient.invalidateQueries({ queryKey: qk.meetings(projectId) }),
        queryClient.invalidateQueries({ queryKey: qk.categories(projectId) }),
      ])
      router.push(`/${organizationId}/projects/${projectId}/reunions/${meetingId}/compte-rendu`)
    } catch (err) {
      console.error('Diffusion', err)
      alert('La diffusion a échoué. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  const removeDraft = async () => {
    if (!confirm(`Supprimer le brouillon de la réunion n° ${meeting.numero} ? Les points ouverts pendant cette réunion seront supprimés.`)) return
    setBusy(true)
    try {
      await deleteMeeting(meetingId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.meetings(projectId) }),
        queryClient.invalidateQueries({ queryKey: qk.meetingPoints(projectId) }),
      ])
      router.push(`/${organizationId}/projects/${projectId}/reunions`)
    } catch (err) {
      console.error('Suppression', err)
      alert('Suppression impossible.')
      setBusy(false)
    }
  }

  const reopen = async () => {
    if (!confirm(`Repasser la réunion n° ${meeting.numero} en brouillon pour la corriger ? Il faudra la diffuser à nouveau.`)) return
    setBusy(true)
    try {
      await reopenMeeting(meetingId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.meeting(meetingId) }),
        queryClient.invalidateQueries({ queryKey: qk.meetings(projectId) }),
      ])
    } catch (err) {
      console.error('Réouverture', err)
      alert('Réouverture impossible.')
    } finally {
      setBusy(false)
    }
  }

  const back = `/${organizationId}/projects/${projectId}/reunions`

  if (meetingQuery.isError) {
    return (
      <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
        <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />
        <div className="max-w-xl mx-auto mt-24 text-center">
          <p className="text-[14px] text-mine mb-4">Cette réunion n&apos;existe pas ou a été supprimée.</p>
          <Link href={back} className="text-[14px] font-medium text-encre underline underline-offset-2">Retour aux réunions</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-6 sm:px-8 pt-6 pb-16 max-w-[1100px] mx-auto">
        <Link href={back} className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Réunions
        </Link>

        {!meeting ? (
          <div className="space-y-4">
            <div className="h-7 w-64 rounded-[6px] bg-voile animate-pulse" />
            <div className="h-64 rounded-[12px] bg-white border border-filet animate-pulse" />
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Réunion n° {meeting.numero}</h1>
                  {meeting.statut === 'brouillon' ? (
                    <span className="px-2 py-0.5 rounded-full bg-tirage-pale text-tirage text-[12px] font-medium">Brouillon</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-voile text-mine text-[12px] inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Diffusée le {new Date(meeting.diffusee_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-mine-clair mt-0.5 h-5">
                  {saveState === 'saving' && 'Enregistrement…'}
                  {saveState === 'saved' && 'Modifications enregistrées'}
                  {saveState === 'error' && <span className="text-alerte">Une modification n&apos;a pas pu être enregistrée.</span>}
                  {!saveState && (meeting.statut === 'brouillon' ? 'Chaque modification est enregistrée automatiquement.' : 'Compte rendu diffusé : la réunion ne peut plus être modifiée.')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {meeting.statut === 'brouillon' && canEdit && (
                  <button onClick={removeDraft} disabled={busy} className="p-2 rounded-[8px] text-mine-clair hover:text-alerte hover:bg-alerte-pale transition-colors" aria-label="Supprimer le brouillon" title="Supprimer le brouillon">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {canReopen && (
                  <button onClick={reopen} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-filet bg-white text-[14px] font-medium text-mine hover:bg-survol">
                    <RotateCcw className="w-4 h-4" />
                    Rouvrir
                  </button>
                )}
                <Link
                  href={`/${organizationId}/projects/${projectId}/reunions/${meetingId}/compte-rendu`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-filet bg-white text-[14px] font-medium text-mine hover:bg-survol"
                >
                  <FileText className="w-4 h-4" />
                  {meeting.statut === 'brouillon' ? 'Aperçu du compte rendu' : 'Compte rendu'}
                </Link>
                {meeting.statut === 'brouillon' && canEdit && (
                  <button onClick={diffuse} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-encre text-white text-[14px] font-medium hover:bg-encre-survol disabled:opacity-60">
                    <Send className="w-4 h-4" />
                    Diffuser
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* 1. Informations */}
              <Section title="Informations">
                <div className="p-5 grid gap-4 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
                  <div>
                    <Label htmlFor="m-date">Date</Label>
                    <input id="m-date" type="date" value={meeting.date ?? ''} disabled={readOnly}
                      onChange={(e) => e.target.value && patchMeeting({ date: e.target.value })} className={clsx(inputClass, 'tabular-nums')} />
                  </div>
                  <div>
                    <Label htmlFor="m-heure">Heure</Label>
                    <input id="m-heure" type="time" value={meeting.heure ?? ''} disabled={readOnly}
                      onChange={(e) => patchMeeting({ heure: e.target.value || null })} className={clsx(inputClass, 'tabular-nums')} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="m-lieu">Lieu</Label>
                    <AutoField id="m-lieu" value={meeting.lieu} disabled={readOnly} onSave={(lieu) => patchMeeting({ lieu: lieu.trim() || null })} placeholder="Bureau de chantier" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="m-objet">Objet</Label>
                    <AutoField id="m-objet" value={meeting.objet} disabled={readOnly} onSave={(objet) => patchMeeting({ objet: objet.trim() || 'Réunion de chantier' })} />
                  </div>
                  <div>
                    <Label htmlFor="m-prochaine">Prochaine réunion</Label>
                    <input id="m-prochaine" type="date" value={meeting.prochaine_date ?? ''} disabled={readOnly}
                      onChange={(e) => patchMeeting({ prochaine_date: e.target.value || null })} className={clsx(inputClass, 'tabular-nums')} />
                  </div>
                  <div>
                    <Label htmlFor="m-prochaine-heure">à</Label>
                    <input id="m-prochaine-heure" type="time" value={meeting.prochaine_heure ?? ''} disabled={readOnly}
                      onChange={(e) => patchMeeting({ prochaine_heure: e.target.value || null })} className={clsx(inputClass, 'tabular-nums')} />
                  </div>
                  <div className="sm:col-span-4">
                    <Label htmlFor="m-obs">Observations générales</Label>
                    <AutoField id="m-obs" multiline rows={3} value={meeting.observations} disabled={readOnly}
                      onSave={(observations) => patchMeeting({ observations: observations.trim() || null })}
                      placeholder="Météo, effectifs, sécurité, approvisionnements…" />
                  </div>
                </div>
              </Section>

              {/* 2. Présents */}
              <Attendees
                meeting={meeting}
                entreprises={entreprises}
                readOnly={readOnly}
                onAdd={(fields) =>
                  run(async () => {
                    const row = await addAttendee(meetingId, { ...fields, ordre: meeting.meeting_attendees.length + 1 })
                    patchAttendees((list) => [...list, row])
                  })
                }
                onUpdate={(id, fields) => {
                  patchAttendees((list) => list.map((a) => (a.id === id ? { ...a, ...fields } : a)))
                  return run(() => updateAttendee(id, fields))
                }}
                onDelete={(id) => {
                  patchAttendees((list) => list.filter((a) => a.id !== id))
                  return run(() => deleteAttendee(id))
                }}
              />

              {/* 3. Avancement */}
              <Section title="Avancement des lots" hint="Constaté ce jour. Reporté sur les lots à la diffusion du compte rendu.">
                {lots.length === 0 ? (
                  <p className="p-5 text-[14px] text-mine-clair">Aucun lot sur ce projet.</p>
                ) : (
                  <ul className="divide-y divide-voile">
                    {lots.map((lot) => {
                      const row = meeting.meeting_lot_progress.find((p) => p.lot_id === lot.id)
                      const value = row?.avancement ?? lot.avancement ?? 0
                      const prev = prevQuery.data?.[lot.id]
                      const entreprise = entreprises.find((e) => e.id === lot.entreprise_id)
                      return (
                        <li key={lot.id} className="px-5 py-3.5 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.6fr)] items-center">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-[6px] bg-voile flex items-center justify-center flex-shrink-0 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-encre">
                              {categoriesIcons[lot.icon] ?? categoriesIcons.folder}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium text-encre truncate">{lot.name}</p>
                              <p className="text-[12px] text-mine-clair truncate">{entreprise?.name ?? 'Sans entreprise'}</p>
                            </div>
                          </div>
                          <ProgressSlider
                            lotName={lot.name}
                            value={value}
                            prev={prev}
                            disabled={readOnly}
                            onCommit={(avancement) => avancement !== value && patchProgress(lot.id, { avancement })}
                          />
                          <AutoField
                            value={row?.commentaire}
                            disabled={readOnly}
                            onSave={(commentaire) => patchProgress(lot.id, { commentaire: commentaire.trim() || null })}
                            placeholder={readOnly ? '' : 'Commentaire (ouvrages en cours, retard…)'}
                            className="py-1.5 text-[13px]"
                            aria-label={`Commentaire du lot ${lot.name}`}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Section>

              {/* 4. Points */}
              {pointsQuery.isPending ? (
                <div className="h-40 rounded-[12px] bg-white border border-filet animate-pulse" />
              ) : (
                <PointsSection
                  meeting={meeting}
                  points={points}
                  lots={lots}
                  entreprises={entreprises}
                  readOnly={readOnly}
                  numeroOf={numeroOf}
                  {...pointActions}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Curseur d'avancement : valeur locale pendant le geste, enregistrée au relâchement. */
function ProgressSlider({ lotName, value, prev, disabled, onCommit }) {
  const [local, setLocal] = useState(value)
  const dragging = useRef(false)
  useEffect(() => {
    if (!dragging.current) setLocal(value)
  }, [value])
  const commit = () => {
    dragging.current = false
    onCommit(local)
  }
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={0} max={100} step={5} value={local} disabled={disabled}
        onChange={(e) => {
          dragging.current = true
          setLocal(Number(e.target.value))
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={() => dragging.current && commit()}
        className="flex-1 accent-[var(--zs-tirage)]"
        aria-label={`Avancement du lot ${lotName}`}
      />
      <span className="w-11 text-right text-[14px] font-semibold text-encre tabular-nums">{local} %</span>
      <span className={clsx('w-12 text-[12px] tabular-nums', prev == null ? 'text-transparent' : local > prev ? 'text-valide' : 'text-mine-clair')}>
        {prev == null ? '—' : local === prev ? '=' : `${local > prev ? '+' : ''}${local - prev}`}
      </span>
    </div>
  )
}

function Attendees({ meeting, entreprises, readOnly, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(null)
  const list = meeting.meeting_attendees
  const present = list.filter((a) => a.presence === 'present').length

  const submit = async (e) => {
    e.preventDefault()
    const entreprise = entreprises.find((x) => x.id === adding.entreprise_id)
    const societe = entreprise?.name ?? adding.societe.trim()
    if (!societe && !adding.nom.trim()) return
    await onAdd({ entreprise_id: entreprise?.id ?? null, societe: societe || null, nom: adding.nom.trim() || null, presence: 'present' })
    setAdding({ entreprise_id: '', societe: '', nom: '' })
  }

  return (
    <Section
      title="Présents"
      hint={`${present} présent${present > 1 ? 's' : ''} sur ${list.length} convoqué${list.length > 1 ? 's' : ''}`}
      action={!readOnly && !adding && (
        <button onClick={() => setAdding({ entreprise_id: '', societe: '', nom: '' })} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mine hover:text-encre">
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      )}
    >
      {list.length === 0 && !adding ? (
        <p className="p-5 text-[14px] text-mine-clair">Aucun participant. Attribuez des entreprises aux lots pour les convoquer automatiquement.</p>
      ) : (
        <ul className="divide-y divide-voile">
          {list.map((a) => (
            <li key={a.id} className="px-5 py-2.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center">
              <p className="text-[14px] font-medium text-encre truncate">{a.societe ?? '—'}</p>
              {readOnly ? (
                <p className="text-[14px] text-mine truncate">{a.nom ?? ''}</p>
              ) : (
                <AutoField value={a.nom} onSave={(nom) => onUpdate(a.id, { nom: nom.trim() || null })} placeholder="Nom du représentant" className="py-1.5 text-[13px]" aria-label="Nom du représentant" />
              )}
              <Segmented value={a.presence} options={PRESENCE_OPTIONS} disabled={readOnly} onChange={(presence) => onUpdate(a.id, { presence })} size="sm" />
              {!readOnly ? (
                <button onClick={() => onDelete(a.id)} className="p-1 rounded-[6px] text-mine-clair hover:text-alerte hover:bg-alerte-pale justify-self-end" aria-label={`Retirer ${a.societe ?? a.nom}`}>
                  <X className="w-4 h-4" />
                </button>
              ) : <span />}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form onSubmit={submit} className="px-5 py-3 border-t border-voile bg-survol flex flex-wrap gap-2 items-center">
          <select
            value={adding.entreprise_id}
            onChange={(e) => setAdding((s) => ({ ...s, entreprise_id: e.target.value }))}
            className={clsx(inputClass, 'w-auto min-w-[200px] py-1.5')}
            aria-label="Entreprise"
          >
            <option value="">Autre société…</option>
            {entreprises.filter((e) => !list.some((a) => a.entreprise_id === e.id)).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {!adding.entreprise_id && (
            <input value={adding.societe} onChange={(e) => setAdding((s) => ({ ...s, societe: e.target.value }))} placeholder="Maître d'ouvrage, bureau de contrôle…" className={clsx(inputClass, 'w-auto flex-1 min-w-[180px] py-1.5')} aria-label="Société" />
          )}
          <input value={adding.nom} onChange={(e) => setAdding((s) => ({ ...s, nom: e.target.value }))} placeholder="Nom" className={clsx(inputClass, 'w-auto flex-1 min-w-[140px] py-1.5')} aria-label="Nom" />
          <button type="button" onClick={() => setAdding(null)} className="px-3 py-1.5 text-[13px] font-medium text-mine hover:text-encre">Fermer</button>
          <button type="submit" className="px-3 py-1.5 text-[13px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px]">Ajouter</button>
        </form>
      )}
    </Section>
  )
}
