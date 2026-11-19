'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Camera, ClipboardCheck, Download, FileText, History, Loader2, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import NavBar from '@/components/NavBar'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { PIN_TYPES } from '@/lib/data/pinTypes'
import { REPORT_KINDS, templateKind } from '@/lib/data/reportKinds'
import {
  PERIOD_PRESETS, defaultPreset, deleteReport, fetchReportCandidates, fetchReports, fmtDay, fmtSize,
  generateReport, itemsForReport, lastReportByKind, periodLabel, reportDownload, resolvePeriod,
  startDownload, uploadReportImages,
} from '@/lib/data/reports'

const ReportFieldsModal = dynamic(() => import('../tasks/ReportFieldsModal'), { ssr: false })

// Les trois rapports par nature ; le rapport libre se compose depuis la liste.
const CARDS = [
  { kind: 'reserves', icon: ClipboardCheck },
  { kind: 'visite', icon: Camera },
  { kind: 'avancement', icon: BarChart3 },
]

const DEFAULT_FIELDS = {
  description: true, photos: true, snapshot: true,
  assignedTo: true, dueDate: true, category: true, status: true, planning: false,
}

const KIND_BADGE = {
  reserves: 'bg-alerte-pale text-alerte',
  visite: 'bg-voile text-mine',
  avancement: 'bg-tirage-pale text-tirage',
  libre: 'bg-papier text-mine border border-filet',
}

const itemWord = (kind, n) => {
  const type = REPORT_KINDS[kind]?.pinType
  if (!type) return n > 1 ? 'éléments' : 'élément'
  return (n > 1 ? PIN_TYPES[type].plural : PIN_TYPES[type].label).toLowerCase()
}

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function RapportsPage({ params }) {
  const { organizationId, projectId } = params
  const queryClient = useQueryClient()
  const { profile, isAdmin } = useUserData(organizationId)
  const { project } = useProjectData()
  const canEdit = profile && profile.role !== 'guest'

  const reportsQuery = useQuery({ queryKey: qk.reports(projectId), queryFn: () => fetchReports(projectId) })
  const candidatesQuery = useQuery({ queryKey: qk.reportCandidates(projectId), queryFn: () => fetchReportCandidates(projectId) })
  const templatesQuery = useQuery({
    queryKey: qk.reportTemplates(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates').select('*').eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(organizationId),
  })
  const membersQuery = useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_projects').select('id, role, members(id, name, email)').eq('project_id', projectId)
      if (error) throw error
      return (data ?? []).map((m) => ({ ...m.members, role: m.role, memberId: m.id }))
    },
  })

  const reports = reportsQuery.data ?? []
  const lastByKind = useMemo(() => lastReportByKind(reports), [reports])
  const templates = templatesQuery.data ?? []

  // ── Réglages de chaque carte : période et modèle ──────────────────────────
  const [presets, setPresets] = useState({})
  const [customs, setCustoms] = useState({})
  const [templateIds, setTemplateIds] = useState({})
  const presetOf = (kind) => presets[kind] ?? defaultPreset(kind, lastByKind[kind])
  const periodOf = (kind) => resolvePeriod(presetOf(kind), { lastReport: lastByKind[kind], custom: customs[kind] })
  const templatesOf = (kind) => templates.filter((t) => templateKind(t) === kind || templateKind(t) === 'libre')
  const templateOf = (kind) => {
    const chosen = templateIds[kind]
    if (chosen === '') return null
    if (chosen) return templates.find((t) => t.id === chosen) ?? null
    const own = templates.filter((t) => templateKind(t) === kind)
    return own.find((t) => t.is_default) || own[0] || null
  }
  const idsOf = (kind) => itemsForReport(candidatesQuery.data ?? [], kind, periodOf(kind))

  // ── Composition et génération ─────────────────────────────────────────────
  const [composing, setComposing] = useState(null) // type de rapport en cours de composition
  const [fields, setFields] = useState(DEFAULT_FIELDS)
  const [generating, setGenerating] = useState(null)

  const openComposer = (kind) => {
    const template = templateOf(kind)
    const own = templateKind(template) === kind
    const f = (own && template?.config?.fields) || REPORT_KINDS[kind].fields
    setFields(Object.fromEntries(Object.keys(DEFAULT_FIELDS).map((k) => [k, f?.[k] ?? DEFAULT_FIELDS[k]])))
    setComposing(kind)
  }

  const handleConfirm = async ({ reportTitle, displayMode, participants, customSections, planningImageFiles, planningObservations, progress, progressContent }) => {
    const kind = composing
    const template = templateOf(kind)
    const period = periodOf(kind)
    const selectedIds = idsOf(kind)
    setComposing(null)
    setGenerating(kind)
    try {
      const planningImages = await uploadReportImages(projectId, planningImageFiles)
      const { downloadUrl, fileName } = await generateReport({
        projectId,
        selectedIds,
        fields,
        displayMode,
        templateConfig: template?.config || null,
        templateId: template?.id ?? null,
        reportKind: kind,
        templateKind: templateKind(template),
        progress,
        progressContent,
        period,
        reportTitle,
        participants,
        customSections,
        planningImages,
        planningObservations,
      })
      await queryClient.invalidateQueries({ queryKey: qk.reports(projectId) })
      startDownload(downloadUrl, fileName)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Impossible de générer le rapport')
    } finally {
      setGenerating(null)
    }
  }

  // ── Historique ────────────────────────────────────────────────────────────
  const [historyKind, setHistoryKind] = useState('all')
  const [busyRow, setBusyRow] = useState(null)
  const shown = historyKind === 'all' ? reports : reports.filter((r) => r.kind === historyKind)
  const countByKind = useMemo(() => reports.reduce((o, r) => ({ ...o, [r.kind]: (o[r.kind] ?? 0) + 1 }), {}), [reports])

  const download = async (row) => {
    setBusyRow(row.id)
    try {
      const { downloadUrl, fileName } = await reportDownload(row.id)
      startDownload(downloadUrl, fileName)
    } catch (err) {
      alert(err.message || 'Téléchargement impossible')
    } finally {
      setBusyRow(null)
    }
  }

  const remove = async (row) => {
    if (!confirm(`Supprimer « ${row.title} » du ${fmtDateTime(row.created_at)} ? Le fichier sera effacé.`)) return
    setBusyRow(row.id)
    try {
      await deleteReport(row.id)
      await queryClient.invalidateQueries({ queryKey: qk.reports(projectId) })
    } catch (err) {
      alert(err.message || 'Suppression impossible')
    } finally {
      setBusyRow(null)
    }
  }

  const loading = reportsQuery.isPending || candidatesQuery.isPending

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-8 pt-6 pb-10 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Rapports</h1>
          <p className="text-[13px] text-mine-clair mt-0.5 tabular-nums">
            {loading ? (
              <span className="inline-block h-3 w-40 bg-voile rounded-[6px] animate-pulse align-middle" />
            ) : reports.length ? (
              `${reports.length} rapport${reports.length > 1 ? 's' : ''} généré${reports.length > 1 ? 's' : ''} · dernier le ${fmtDateTime(reports[0].created_at)}`
            ) : (
              'Réserves, visites de chantier et avancement, sur la période de votre choix'
            )}
          </p>
        </div>

        {/* ── Nouveau rapport ── */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {CARDS.map(({ kind, icon: Icon }) => {
            const k = REPORT_KINDS[kind]
            const last = lastByKind[kind]
            const preset = presetOf(kind)
            const period = periodOf(kind)
            const count = loading ? null : idsOf(kind).length
            const kindTemplates = templatesOf(kind)
            const template = templateOf(kind)
            const busy = generating === kind
            return (
              <section key={kind} className="bg-white rounded-[12px] border border-filet shadow-carte flex flex-col">
                <div className="px-5 pt-5 pb-4 flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="w-8 h-8 rounded-[8px] bg-papier border border-filet flex items-center justify-center">
                      <Icon className="w-4 h-4 text-encre" />
                    </span>
                    <h2 className="text-[15px] font-medium text-encre">{k.label}</h2>
                  </div>
                  <p className="text-[13px] text-mine-clair leading-relaxed mb-4">{k.hint}</p>

                  <label className="block text-[12px] font-medium text-mine-clair mb-1">Période</label>
                  <select
                    value={preset}
                    onChange={(e) => setPresets((p) => ({ ...p, [kind]: e.target.value }))}
                    className="w-full rounded-[8px] border border-filet bg-white px-3 py-2 text-[14px] text-encre focus:outline-none focus:border-encre"
                  >
                    {PERIOD_PRESETS.map((p) => (
                      <option key={p.key} value={p.key} disabled={p.key === 'since-last' && !last}>
                        {p.key === 'since-last' && last ? `${p.label} (${fmtDay(last.created_at.slice(0, 10))})` : p.label}
                      </option>
                    ))}
                  </select>
                  {preset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['start', 'end'].map((side) => (
                        <input
                          key={side}
                          type="date"
                          aria-label={side === 'start' ? 'Début de la période' : 'Fin de la période'}
                          value={customs[kind]?.[side] ?? ''}
                          onChange={(e) => setCustoms((c) => ({ ...c, [kind]: { ...c[kind], [side]: e.target.value } }))}
                          className="rounded-[8px] border border-filet px-2.5 py-1.5 text-[13px] text-encre focus:outline-none focus:border-encre"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[12px] text-mine-clair mt-1.5">
                    {period ? periodLabel(period) : kind === 'avancement' ? 'Situation à ce jour' : `Toutes les ${PIN_TYPES[k.pinType].plural.toLowerCase()} du projet`}
                    {kind === 'avancement' && period ? ' · tâches actives sur la période' : ''}
                    {kind !== 'avancement' && period ? ' · constatées sur la période' : ''}
                  </p>

                  {kindTemplates.length > 0 && (
                    <>
                      <label className="block text-[12px] font-medium text-mine-clair mb-1 mt-3">Modèle</label>
                      <select
                        value={template?.id ?? ''}
                        onChange={(e) => setTemplateIds((t) => ({ ...t, [kind]: e.target.value }))}
                        className="w-full rounded-[8px] border border-filet bg-white px-3 py-2 text-[14px] text-encre focus:outline-none focus:border-encre"
                      >
                        <option value="">Présentation {k.short.toLowerCase()}</option>
                        {kindTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-voile flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-encre tabular-nums">
                      {count == null ? <span className="inline-block h-3.5 w-20 bg-voile rounded-[4px] animate-pulse align-middle" /> : `${count} ${itemWord(kind, count)}`}
                    </p>
                    <p className="text-[12px] text-mine-clair truncate">
                      {last ? `Dernier : ${fmtDateTime(last.created_at)}` : 'Aucun rapport pour l’instant'}
                    </p>
                  </div>
                  <button
                    onClick={() => openComposer(kind)}
                    disabled={!count || Boolean(generating)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol disabled:opacity-40 transition-colors"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {busy ? 'Génération…' : 'Composer'}
                  </button>
                </div>
              </section>
            )
          })}
        </div>

        {/* ── Historique ── */}
        <section className="bg-white rounded-[12px] border border-filet shadow-carte overflow-hidden">
          <div className="px-5 py-4 border-b border-voile flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-[15px] font-medium text-encre flex items-center gap-2">
              <History className="w-4 h-4 text-mine-clair" />
              Historique
            </h2>
            <div className="flex gap-1 p-1 bg-voile rounded-[8px]">
              {['all', 'reserves', 'visite', 'avancement', 'libre'].map((k) => (
                <button
                  key={k}
                  onClick={() => setHistoryKind(k)}
                  className={clsx(
                    'px-2.5 py-1 rounded-[6px] text-[13px] font-medium transition-colors tabular-nums',
                    historyKind === k ? 'bg-white text-encre shadow-[0_1px_2px_rgba(15,15,15,0.08)]' : 'text-mine-clair hover:text-encre'
                  )}
                >
                  {k === 'all' ? 'Tous' : REPORT_KINDS[k].short}
                  {k !== 'all' && countByKind[k] ? <span className="ml-1 text-mine-clair">{countByKind[k]}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {reportsQuery.isPending ? (
            <div className="divide-y divide-voile">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-5 py-4 flex gap-4">
                  <div className="h-4 w-28 rounded-[4px] bg-voile animate-pulse" />
                  <div className="h-4 w-64 rounded-[4px] bg-voile animate-pulse" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="w-8 h-8 text-filet-fort mx-auto mb-3" />
              <p className="text-[14px] text-mine-clair">
                {reports.length ? 'Aucun rapport de ce type.' : 'Les rapports générés ici ou depuis la '}
                {!reports.length && (
                  <Link href={`/${organizationId}/projects/${projectId}/tasks`} className="text-encre underline underline-offset-2">liste des tâches</Link>
                )}
                {!reports.length && ' apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-mine-clair border-b border-voile">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 font-medium">Rapport</th>
                    <th className="px-3 py-2.5 font-medium">Période</th>
                    <th className="px-3 py-2.5 font-medium text-right">Éléments</th>
                    <th className="px-3 py-2.5 font-medium">Par</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-voile">
                  {shown.map((r) => (
                    <tr key={r.id} className="hover:bg-survol">
                      <td className="px-5 py-3 text-mine tabular-nums whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={clsx('px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium flex-shrink-0', KIND_BADGE[r.kind] ?? KIND_BADGE.libre)}>
                            {REPORT_KINDS[r.kind]?.short ?? 'Libre'}
                          </span>
                          <span className="text-encre font-medium truncate">{r.title}</span>
                        </div>
                        <p className="text-[12px] text-mine-clair mt-0.5 truncate">{r.file_name} · {fmtSize(r.file_size)}</p>
                      </td>
                      <td className="px-3 py-3 text-mine whitespace-nowrap">{periodLabel({ start: r.period_start, end: r.period_end })}</td>
                      <td className="px-3 py-3 text-mine text-right tabular-nums">{r.item_count}</td>
                      <td className="px-3 py-3 text-mine whitespace-nowrap">{r.members?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => download(r)}
                            disabled={busyRow === r.id}
                            title="Télécharger"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-filet text-[13px] font-medium text-mine hover:bg-white hover:text-encre disabled:opacity-50"
                          >
                            {busyRow === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            PDF
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => remove(r)}
                              disabled={busyRow === r.id}
                              title="Supprimer"
                              aria-label={`Supprimer ${r.title}`}
                              className="p-1.5 rounded-[8px] text-mine-clair hover:text-alerte hover:bg-alerte-pale disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {composing && (
        <ReportFieldsModal
          key={`${composing}-${templateOf(composing)?.id ?? 'defaut'}`}
          reportKind={composing}
          ownTemplate={templateKind(templateOf(composing)) === composing}
          fields={fields}
          setFields={setFields}
          onClose={() => setComposing(null)}
          onConfirm={handleConfirm}
          templateConfig={templateOf(composing)?.config || null}
          projectMembers={membersQuery.data ?? []}
        />
      )}
    </div>
  )
}
