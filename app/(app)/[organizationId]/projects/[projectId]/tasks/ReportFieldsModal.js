'use client'

import { useState } from 'react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Download, FileText, Upload, X as XCloseIcon, XIcon } from 'lucide-react'
import clsx from 'clsx'
import RichTextEditor from '@/components/RichTextEditor'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

// ── Report Fields Modal (refactorisée) ────────────────────────────────────────
export default function ReportFieldsModal({ fields, setFields, onClose, onConfirm, templateConfig: rawTemplateConfig, projectMembers }) {
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
  const [displayMode, setDisplayMode] = useState(templateConfig?.tasks?.displayMode || 'list')
  const [reportTitle, setReportTitle] = useState(templateConfig?.reportTitle || 'RAPPORT DE TÂCHES')

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

  const handleConfirm = () => {
    onConfirm({
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
    assignedTo: 'Assigné à', dueDate: 'Échéance', category: 'Catégorie', status: 'Statut',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className={clsx(GeistSans.className, 'bg-white w-full max-w-2xl rounded-[6px] border border-stone-200 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-h-[92vh] flex flex-col')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-medium text-stone-950">Composer le rapport</h3>
            {templateConfig?.reportTitle && (
              <p className={clsx('text-[11px] text-stone-500 mt-0.5', GeistMono.className)}>{templateConfig.reportTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-[3px] hover:bg-stone-100 transition-colors">
            <XIcon className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          <div>
            <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Titre du rapport</p>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="RAPPORT DE TÂCHES"
              className="w-full rounded-[4px] border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-medium text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              Ce titre apparaîtra sur la couverture et dans le résumé du rapport.
            </p>
          </div>

          {/* Display mode */}
          <div>
            <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Mode d'affichage</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'list',  label: 'Liste détaillée', icon: <FileText className="w-4 h-4" /> },
                { key: 'table', label: 'Tableau compact',  icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )},
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-[4px] border text-[13px] font-medium transition-colors',
                    displayMode === key
                      ? 'bg-stone-950 text-white border-stone-950'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em] mb-2', GeistMono.className)}>Champs à inclure</p>
            <div className="space-y-0.5">
              {Object.entries(fields).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 rounded-[3px] hover:bg-stone-100 transition-colors cursor-pointer">
                  <input type="checkbox" checked={value} onChange={() => toggle(key)} className="w-3.5 h-3.5 rounded-[2px] border-stone-300 accent-stone-950" />
                  <span className="text-[13px] text-stone-700">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Participants */}
          {showParticipants && (
            <div>
              <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em] mb-2', GeistMono.className)}>
                {participantsConfig.title || 'Participants'}
              </p>
              {participants.length === 0 ? (
                <p className="text-[12px] text-stone-400 px-1">Aucun membre trouvé sur ce projet.</p>
              ) : (
                <div className="border border-stone-200 rounded-[4px] overflow-hidden divide-y divide-stone-100">
                  {participants.map(member => (
                    <div key={member.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-stone-100 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-medium text-stone-700 flex-shrink-0">
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-stone-800">{member.name || '—'}</p>
                          <div className="flex items-center gap-2">
                            {participantsConfig.showRoles   && member.role  && <p className="text-[11px] text-stone-500">{member.role}</p>}
                            {participantsConfig.showContact && member.email && <p className="text-[11px] text-stone-400">{member.email}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('text-[11px] font-medium', member.present ? 'text-green-700' : 'text-stone-400')}>
                          {member.present ? 'Présent' : 'Absent'}
                        </span>
                        <button
                          onClick={() => toggleParticipant(member.id)}
                          className={clsx('w-8 h-4 rounded-full transition-colors relative flex-shrink-0', member.present ? 'bg-stone-950' : 'bg-stone-100')}
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
              <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em]', GeistMono.className)}>
                {templateConfig.planning.title || 'Pointage de planning'}
              </p>

              {planningImageFiles.length > 0 && (
                <div className="space-y-2">
                  {planningImageFiles.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 bg-stone-100 rounded-[4px] p-2 border border-stone-200">
                      <img src={img.url} alt={img.name} className="w-14 h-10 object-cover rounded-[3px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-stone-950 truncate">{img.name}</p>
                        <p className={clsx('text-[10px] text-stone-500', GeistMono.className)}>Page {i + 1}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => movePlanningImage(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-stone-100 disabled:opacity-20 text-[11px] font-bold">▲</button>
                        <button type="button" onClick={() => movePlanningImage(i, 1)} disabled={i === planningImageFiles.length - 1} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-stone-100 disabled:opacity-20 text-[11px] font-bold">▼</button>
                        <button type="button" onClick={() => removePlanningImage(i)} className="w-6 h-6 flex items-center justify-center rounded-[3px] hover:bg-red-50 text-red-600">
                          <XCloseIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handlePlanningImageUpload} className="sr-only" />
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-stone-200 rounded-[4px] cursor-pointer hover:border-stone-500 hover:bg-stone-100 transition-all">
                  <Upload className="w-4 h-4 text-stone-500" />
                  <span className="text-[12px] text-stone-700">Ajouter des captures de planning</span>
                </div>
              </label>

              <p className="text-[10px] text-stone-500 px-1">
                Format recommandé : capture d'écran de votre Gantt MS Project. {templateConfig.planning.imagesPerPage === 2 ? '2 images par page.' : '1 image par page.'}
              </p>

              {showPlanningObs && (
                <div className="space-y-2 pt-3 border-t border-stone-100">
                  <p className="text-[12px] font-medium text-stone-800">{templateConfig.planning.observationsTitle || 'Retards et observations'}</p>
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
              <p className={clsx('text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em]', GeistMono.className)}>Sections additionnelles</p>
              {customSectionContents.map(section => (
                <div key={section.id} className="space-y-2">
                  <label className="text-[12px] font-medium text-stone-800">{section.title}</label>
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
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-stone-700 bg-stone-100 rounded-[4px] hover:bg-stone-300 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white rounded-[4px] text-[13px] font-medium hover:bg-stone-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}