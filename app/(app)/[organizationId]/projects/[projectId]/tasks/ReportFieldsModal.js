'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { GeistSans } from 'geist/font/sans';
import { Download, FileText, Image as ImageIcon, MapPin, Upload, X as XCloseIcon, XIcon } from 'lucide-react'
import clsx from 'clsx'
import RichTextEditor from '@/components/RichTextEditor'
import { DEFAULT_PROGRESS, PROGRESS_PARTS, REPORT_KINDS, REPORT_KIND_KEYS } from '@/lib/data/reportKinds'
import { fetchLots, todayISO } from '@/lib/data/lots'
import { qk } from '@/lib/data/keys'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

// ── Report Fields Modal (refactorisée) ────────────────────────────────────────
export default function ReportFieldsModal({ reportKind = 'libre', ownTemplate = true, onKindChange, fields, setFields, onClose, onConfirm, templateConfig: rawTemplateConfig, projectMembers }) {
  const kind = REPORT_KINDS[reportKind] ?? REPORT_KINDS.libre
  const templateConfig = {
    ...rawTemplateConfig,
    planning: {
      enabled:           false,
      title:             "Pointage de planning",
      imagesPerPage:     1,
      fitMode:           "contain",
      showObservations:  true,
      observationsTitle: "Retards et observations",
      ...(rawTemplateConfig?.planning || {}),
    },
  }
  // Mode du modèle s'il convient à ce type de rapport, sinon celui du type.
  const modesForKind = { visite: ['visite', 'localizedPhotos', 'photoGallery'], reserves: ['list', 'table'], avancement: ['list', 'table'] }[reportKind]
  const templateMode = templateConfig?.tasks?.displayMode
  const [displayMode, setDisplayMode] = useState(
    templateMode && (!modesForKind || modesForKind.includes(templateMode)) ? templateMode : kind.displayMode
  )
  // Le titre d'un modèle « libre » ne convient pas à un rapport typé.
  const [reportTitle, setReportTitle] = useState((ownTemplate && templateConfig?.reportTitle) || kind.title)

  const showParticipants =
    templateConfig?.participants?.enabled === true ||
    templateConfig?.coverPage?.showParticipants === true
  const participantsConfig = templateConfig?.participants || {}

  const [participants, setParticipants] = useState(() =>
    projectMembers.map(m => ({ ...m, present: true }))
  )

  const planningEnabled = templateConfig?.planning?.enabled
  const showPlanningObs = planningEnabled && (templateConfig?.planning?.showObservations ?? true)

  const [planningImageFiles, setPlanningImageFiles]       = useState([])
  const [planningObservations, setPlanningObservations]   = useState(EMPTY_DOC)

  const enabledSections = (templateConfig?.customSections || []).filter(s => s.enabled)
  const [customSectionContents, setCustomSectionContents] = useState(() =>
    enabledSections.map(s => ({ id: s.id, title: s.title, enabled: s.enabled, content: EMPTY_DOC }))
  )

  const toggle = (key) => setFields(f => ({ ...f, [key]: !f[key] }))
  const toggleParticipant = (id) =>
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, present: !p.present } : p))
  const updateSectionContent = (id, content) =>
    setCustomSectionContents(prev => prev.map(s => s.id === id ? { ...s, content } : s))

  const handlePlanningImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newImages = files.map(file => ({
      file,
      url:  URL.createObjectURL(file),
      name: file.name,
    }))
    setPlanningImageFiles(prev => [...prev, ...newImages])
    e.target.value = ''
  }

  const removePlanningImage = (index) => {
    setPlanningImageFiles(prev => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed?.url?.startsWith('blob:')) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  const movePlanningImage = (index, dir) => {
    setPlanningImageFiles(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const [progress, setProgress] = useState(() => ({ ...DEFAULT_PROGRESS, ...(templateConfig?.progress || {}) }))
  const isProgress = reportKind === 'avancement'

  // Effectifs de site : une ligne par entreprise titulaire d'un lot, plus
  // les entreprises ajoutées à la main (sous-traitants…).
  const { projectId } = useParams()
  const lotsQuery = useQuery({
    queryKey: [...qk.categories(projectId), 'lots'],
    queryFn: () => fetchLots(projectId),
    enabled: isProgress && Boolean(projectId),
  })
  const lotCompanies = useMemo(() => {
    const byKey = new Map()
    for (const lot of lotsQuery.data ?? []) {
      if (!lot.entreprises?.name) continue
      const key = lot.entreprises.id ?? lot.entreprises.name
      const row = byKey.get(key) ?? { key, name: lot.entreprises.name, lots: [] }
      row.lots.push(lot.name)
      byKey.set(key, row)
    }
    return [...byKey.values()].map((r) => ({ ...r, lots: r.lots.join(', ') }))
  }, [lotsQuery.data])
  const [counts, setCounts] = useState({})
  const [extraCompanies, setExtraCompanies] = useState([])
  const [workforceDate, setWorkforceDate] = useState(todayISO)
  const [conclusion, setConclusion] = useState(EMPTY_DOC)
  const totalWorkforce =
    lotCompanies.reduce((n, r) => n + (Number(counts[r.key]) || 0), 0) +
    extraCompanies.reduce((n, r) => n + (Number(r.count) || 0), 0)

  const handleConfirm = () => {
    onConfirm({
      ...(isProgress ? {
        progress,
        progressContent: {
          workforceDate,
          workforce: [
            ...lotCompanies.map((r) => ({ name: r.name, lots: r.lots, count: Number(counts[r.key]) || 0 })),
            ...extraCompanies.map((r) => ({ name: r.name.trim(), lots: '', count: Number(r.count) || 0 })),
          ].filter((r) => r.name && r.count > 0),
          conclusion,
        },
      } : {}),
      reportTitle,
      displayMode,
      participants,
      customSections:        customSectionContents,
      planningImageFiles:    planningImageFiles.map(p => p.file),
      planningObservations,
    })
  }

  const FIELD_LABELS = {
    description: 'Description', photos: 'Photos', snapshot: 'Snapshot du plan',
    assignedTo: 'Assigné à', dueDate: 'Échéance', category: 'Lot', status: 'Statut',
    planning: 'Planning (début, avancement)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className={clsx(GeistSans.className, 'bg-white w-full max-w-2xl rounded-[12px] border border-filet shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-h-[92vh] flex flex-col')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-voile flex-shrink-0">
          <div>
            <h3 className="text-base font-medium text-encre">{reportKind === 'libre' ? 'Composer le rapport' : kind.label}</h3>
            {templateConfig?.reportTitle && (
              <p className={clsx('text-[12px] text-mine-clair mt-0.5', 'tabular-nums')}>{templateConfig.reportTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-[6px] hover:bg-voile transition-colors">
            <XIcon className="w-4 h-4 text-mine-clair" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {onKindChange && (
            <div>
              <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>Type de rapport</p>
              <div className="grid grid-cols-4 gap-1 p-1 bg-voile rounded-[8px]">
                {REPORT_KIND_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onKindChange(k)}
                    className={clsx(
                      'px-2 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors',
                      reportKind === k ? 'bg-white text-encre shadow-[0_1px_2px_rgba(15,15,15,0.08)]' : 'text-mine-clair hover:text-encre'
                    )}
                  >
                    {REPORT_KINDS[k].short}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-mine-clair mt-1.5">
                {kind.hint}
                {kind.pinType && ' Seuls les éléments de cette nature sont repris.'}
              </p>
            </div>
          )}

          <div>
            <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>Titre du rapport</p>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder={kind.title}
              className="w-full rounded-[8px] border border-filet bg-white px-3 py-2.5 text-[14px] font-medium text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors"
            />
            <p className="text-[11px] text-mine-clair mt-1">
              Ce titre apparaîtra sur la couverture et dans le résumé du rapport.
            </p>
          </div>

          {isProgress && (
            <div>
              <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>Contenu du rapport</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {PROGRESS_PARTS.map(({ key, label, hint }) => {
                  const disabled = key === 'ganttTasks' && !progress.gantt
                  return (
                    <label key={key} className={clsx('flex items-start gap-3 px-3 py-2 rounded-[6px] transition-colors', disabled ? 'opacity-40' : 'hover:bg-survol cursor-pointer')}>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={Boolean(progress[key]) && !disabled}
                        onChange={() => setProgress((p) => ({ ...p, [key]: !p[key] }))}
                        className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border-filet-fort accent-encre"
                      />
                      <span>
                        <span className="block text-[14px] text-mine">{label}</span>
                        <span className="block text-[12px] text-mine-clair">{hint}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {isProgress && progress.workforce && (
            <div>
              <div className="flex items-end justify-between mb-2">
                <p className={clsx('text-[12px] font-medium text-mine-clair', 'tabular-nums')}>Effectifs de site</p>
                <label className="flex items-center gap-2 text-[12px] text-mine-clair">
                  Le
                  <input
                    type="date"
                    value={workforceDate}
                    onChange={(e) => setWorkforceDate(e.target.value)}
                    className="rounded-[6px] border border-filet bg-white px-2 py-1 text-[12px] text-encre tabular-nums focus:outline-none focus:border-encre"
                  />
                </label>
              </div>
              <div className="border border-filet rounded-[8px] overflow-hidden divide-y divide-voile">
                {lotCompanies.map((r) => (
                  <div key={r.key} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-encre truncate">{r.name}</p>
                      <p className="text-[12px] text-mine-clair truncate">{r.lots}</p>
                    </div>
                    <input
                      type="number" min="0" inputMode="numeric" placeholder="0"
                      aria-label={`Effectif ${r.name}`}
                      value={counts[r.key] ?? ''}
                      onChange={(e) => setCounts((c) => ({ ...c, [r.key]: e.target.value }))}
                      className="w-20 rounded-[6px] border border-filet bg-white px-2 py-1.5 text-[14px] text-right text-encre tabular-nums focus:outline-none focus:border-encre"
                    />
                  </div>
                ))}
                {extraCompanies.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <input
                      type="text" placeholder="Entreprise"
                      value={r.name}
                      onChange={(e) => setExtraCompanies((rows) => rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      className="flex-1 min-w-0 rounded-[6px] border border-filet bg-white px-2 py-1.5 text-[14px] text-encre focus:outline-none focus:border-encre"
                    />
                    <input
                      type="number" min="0" inputMode="numeric" placeholder="0"
                      aria-label="Effectif"
                      value={r.count}
                      onChange={(e) => setExtraCompanies((rows) => rows.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))}
                      className="w-20 rounded-[6px] border border-filet bg-white px-2 py-1.5 text-[14px] text-right text-encre tabular-nums focus:outline-none focus:border-encre"
                    />
                    <button type="button" onClick={() => setExtraCompanies((rows) => rows.filter((_, j) => j !== i))} className="p-1 rounded-[6px] hover:bg-voile" aria-label="Retirer">
                      <XCloseIcon className="w-3.5 h-3.5 text-mine-clair" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 bg-survol">
                  <button type="button" onClick={() => setExtraCompanies((rows) => [...rows, { name: '', count: '' }])} className="text-[13px] font-medium text-mine hover:text-encre">
                    + Ajouter une entreprise
                  </button>
                  <span className="text-[13px] font-medium text-encre tabular-nums">Total : {totalWorkforce} pers.</span>
                </div>
              </div>
              <p className="text-[11px] text-mine-clair mt-1">
                {lotsQuery.isSuccess && !lotCompanies.length ? "Aucune entreprise n'est encore liée aux lots : ajoutez-les ici. " : ''}
                Les entreprises sans effectif ne figurent pas dans le rapport.
              </p>
            </div>
          )}

          {/* Display mode (avancement : présentation du détail des tâches, après le contenu) */}
          {(!isProgress || progress.details) && (
          <div>
            <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>{isProgress ? 'Présentation du détail des tâches' : "Mode d'affichage"}</p>
            <div className="grid grid-cols-2 gap-2">
              {(reportKind === 'visite' ? [
                { key: 'visite',          label: 'Fiches de visite', icon: <FileText className="w-4 h-4" /> },
                { key: 'localizedPhotos', label: 'Photos localisées', icon: <MapPin className="w-4 h-4" /> },
                { key: 'photoGallery',    label: 'Galerie photo',     icon: <ImageIcon className="w-4 h-4" /> },
              ] : [
                { key: 'list',  label: 'Liste détaillée', icon: <FileText className="w-4 h-4" /> },
                { key: 'table', label: 'Tableau compact',  icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )},
              ]).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-[8px] border text-[14px] font-medium transition-colors',
                    displayMode === key
                      ? 'bg-encre text-white border-encre'
                      : 'bg-white text-mine border-filet hover:bg-survol'
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>
          )}
          {/* Fields */}
          <div>
            <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>Champs à inclure</p>
            <div className="space-y-0.5">
              {Object.entries(fields).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 rounded-[6px] hover:bg-survol transition-colors cursor-pointer">
                  <input type="checkbox" checked={value} onChange={() => toggle(key)} className="w-3.5 h-3.5 rounded-[4px] border-filet-fort accent-encre" />
                  <span className="text-[14px] text-mine">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Participants */}
          {showParticipants && (
            <div>
              <p className={clsx('text-[12px] font-medium text-mine-clair mb-2', 'tabular-nums')}>
                {participantsConfig.title || 'Participants'}
              </p>
              {participants.length === 0 ? (
                <p className="text-[13px] text-trait px-1">Aucun membre trouvé sur ce projet.</p>
              ) : (
                <div className="border border-filet rounded-[8px] overflow-hidden divide-y divide-voile">
                  {participants.map(member => (
                    <div key={member.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-survol transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-voile border border-filet flex items-center justify-center text-[11px] font-medium text-mine flex-shrink-0">
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-encre-survol">{member.name || '—'}</p>
                          <div className="flex items-center gap-2">
                            {participantsConfig.showRoles   && member.role  && <p className="text-[12px] text-mine-clair">{member.role}</p>}
                            {participantsConfig.showContact && member.email && <p className="text-[12px] text-trait">{member.email}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('text-[12px] font-medium', member.present ? 'text-valide' : 'text-trait')}>
                          {member.present ? 'Présent' : 'Absent'}
                        </span>
                        <button
                          onClick={() => toggleParticipant(member.id)}
                          className={clsx('w-8 h-4 rounded-full transition-colors relative flex-shrink-0', member.present ? 'bg-encre' : 'bg-voile')}
                        >
                          <span className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', member.present ? 'translate-x-4' : 'translate-x-0.5')} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Planning */}
          {planningEnabled && (
            <div className="space-y-3">
              <p className={clsx('text-[12px] font-medium text-mine-clair', 'tabular-nums')}>
                {templateConfig.planning.title || 'Pointage de planning'}
              </p>

              {planningImageFiles.length > 0 && (
                <div className="space-y-2">
                  {planningImageFiles.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 bg-survol rounded-[8px] p-2 border border-filet">
                      <img src={img.url} alt={img.name} className="w-14 h-10 object-cover rounded-[6px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-encre truncate">{img.name}</p>
                        <p className={clsx('text-[11px] text-mine-clair', 'tabular-nums')}>Page {i + 1}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => movePlanningImage(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-voile disabled:opacity-20 text-[12px] font-bold">▲</button>
                        <button type="button" onClick={() => movePlanningImage(i, 1)} disabled={i === planningImageFiles.length - 1} className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-voile disabled:opacity-20 text-[12px] font-bold">▼</button>
                        <button type="button" onClick={() => removePlanningImage(i)} className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-alerte-pale text-alerte">
                          <XCloseIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handlePlanningImageUpload} className="sr-only" />
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-filet rounded-[8px] cursor-pointer hover:border-mine-clair hover:bg-survol transition-all">
                  <Upload className="w-4 h-4 text-mine-clair" />
                  <span className="text-[13px] text-mine">Ajouter des captures de planning</span>
                </div>
              </label>

              <p className="text-[11px] text-mine-clair px-1">
                Format recommandé : capture d'écran de votre Gantt MS Project. {templateConfig.planning.imagesPerPage === 2 ? '2 images par page.' : '1 image par page.'}
              </p>

              {showPlanningObs && (
                <div className="space-y-2 pt-3 border-t border-voile">
                  <p className="text-[13px] font-medium text-encre-survol">{templateConfig.planning.observationsTitle || 'Retards et observations'}</p>
                  <RichTextEditor
                    content={planningObservations}
                    onChange={setPlanningObservations}
                    placeholder="Saisissez les retards constatés et observations..."
                    minHeight={120}
                  />
                </div>
              )}
            </div>
          )}

          {/* Custom sections */}
          {enabledSections.length > 0 && (
            <div className="space-y-4">
              <p className={clsx('text-[12px] font-medium text-mine-clair', 'tabular-nums')}>Sections additionnelles</p>
              {customSectionContents.map(section => (
                <div key={section.id} className="space-y-2">
                  <label className="text-[13px] font-medium text-encre-survol">{section.title}</label>
                  <RichTextEditor
                    content={section.content}
                    onChange={(content) => updateSectionContent(section.id, content)}
                    placeholder={`Contenu de "${section.title}"...`}
                    minHeight={150}
                  />
                </div>
              ))}
            </div>
          )}

          {isProgress && progress.conclusion && (
            <div className="space-y-2">
              <p className={clsx('text-[12px] font-medium text-mine-clair', 'tabular-nums')}>Recommandations et conclusion</p>
              <RichTextEditor
                content={conclusion}
                onChange={setConclusion}
                placeholder="Recommandations aux entreprises, points à suivre, conclusion…"
                minHeight={120}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-voile flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[14px] font-medium text-encre bg-white border border-filet rounded-[8px] hover:bg-survol transition-colors">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}