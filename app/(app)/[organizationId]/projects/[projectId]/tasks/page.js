'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Search, XIcon } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'
import clsx from 'clsx'

import NavBar from '@/components/NavBar'
import PinDrawer from '@/components/PinDrawer'
import PinFilterPanel from '@/components/PinFilterPanel'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'
import { usePinFilters } from '@/hooks/usePinFilters'
import { usePinsCache, useProjectPins, useSelectedPin } from '@/hooks/usePins'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchPinsByIds, fetchProjectPinIds, insertPin } from '@/lib/data/pins'
import { exportTasksToExcel, exportTasksWithMediaToExcel } from '@/lib/exportTasks'
import { BACKEND_URL } from '@/lib/config'

import TaskRow, { TaskRowSkeleton } from './TaskRow'

// Éditeur riche inclus : chargé seulement à l'ouverture de la fenêtre de rapport.
const ReportFieldsModal = dynamic(() => import('./ReportFieldsModal'), { ssr: false })

const TABLE_HEADERS = ['Nom', 'ID', 'Assigné à', 'Catégorie', 'Échéance', 'Localisation', 'Tags']
const DEFAULT_REPORT_FIELDS = {
  description: true, photos: true, snapshot: true,
  assignedTo: true, dueDate: true, category: true, status: true,
}
const NO_SELECTION = { all: false, ids: new Set() }

export default function Tasks({ params }) {
  const { projectId, organizationId } = params

  const { profile, isAdmin } = useUserData(organizationId)
  const { project, categories, statuses } = useProjectData()
  const { filters, setFilters } = usePinFilters()
  const [selectedPin, selectPin] = useSelectedPin()
  const { patchPin, addPin } = usePinsCache()

  // ── Liste paginée, filtrée côté serveur ──────────────────────────────────
  const {
    pins, total, scope,
    isPending, isError, isPlaceholderData,
    hasNextPage, isFetchingNextPage, fetchNextPage, refetch,
  } = useProjectPins(projectId, filters)

  // ── Recherche : champ local, répercuté dans l'URL après une courte pause ──
  const [searchInput, setSearchInput] = useState(filters.q)
  useEffect(() => {
    if (searchInput === filters.q) return
    const timer = setTimeout(() => setFilters({ q: searchInput }), 250)
    return () => clearTimeout(timer)
  }, [searchInput, filters.q, setFilters])
  // Filtres réinitialisés ailleurs (panneau, navigation) : le champ suit.
  const lastUrlQuery = useRef(filters.q)
  useEffect(() => {
    if (filters.q !== lastUrlQuery.current) {
      lastUrlQuery.current = filters.q
      setSearchInput((current) => (current.trim() === filters.q ? current : filters.q))
    }
  }, [filters.q])

  // ── Défilement : charge la page suivante à l'approche du bas ─────────────
  const sentinelRef = useRef(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '400px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ── Sélection ─────────────────────────────────────────────────────────────
  // `all: true` = « tout ce qui correspond aux filtres », `ids` contient alors
  // les exclusions. La sélection ne dépend donc pas des pages déjà chargées.
  const [selection, setSelection] = useState(NO_SELECTION)
  useEffect(() => setSelection(NO_SELECTION), [filters, projectId])

  const isSelected = useCallback(
    (id) => (selection.all ? !selection.ids.has(id) : selection.ids.has(id)),
    [selection]
  )
  const knownTotal = total ?? pins.length
  const selectedCount = selection.all ? Math.max(0, knownTotal - selection.ids.size) : selection.ids.size
  const allSelected = knownTotal > 0 && selectedCount === knownTotal

  const toggleSelect = useCallback((id) => {
    setSelection((prev) => {
      const ids = new Set(prev.ids)
      ids.has(id) ? ids.delete(id) : ids.add(id)
      return { all: prev.all, ids }
    })
  }, [])
  const toggleSelectAll = () => setSelection(allSelected ? NO_SELECTION : { all: true, ids: new Set() })

  const resolveSelectedIds = async () => {
    if (!selection.all) return Array.from(selection.ids)
    const ids = await fetchProjectPinIds({ projectId, filters, scope })
    return ids.filter((id) => !selection.ids.has(id))
  }

  // ── Données annexes ───────────────────────────────────────────────────────
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['report-templates', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(organizationId),
  })

  const { data: projectMembers = [] } = useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_projects')
        .select('id, role, members(id, name, email)')
        .eq('project_id', projectId)
      if (error) throw error
      return (data ?? []).map((m) => ({ ...m.members, role: m.role, memberId: m.id }))
    },
    enabled: Boolean(projectId),
  })

  const [selectedTemplateId, setSelectedTemplateId] = useState(undefined)
  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId === '') return null
    if (selectedTemplateId) return availableTemplates.find((t) => t.id === selectedTemplateId) ?? null
    return availableTemplates.find((t) => t.is_default) || availableTemplates[0] || null
  }, [availableTemplates, selectedTemplateId])

  const [reportFields, setReportFields] = useState(DEFAULT_REPORT_FIELDS)
  useEffect(() => {
    const f = selectedTemplate?.config?.fields
    if (!f) return
    setReportFields(
      Object.fromEntries(Object.keys(DEFAULT_REPORT_FIELDS).map((key) => [key, f[key] ?? true]))
    )
  }, [selectedTemplate])

  // ── Lien direct vers une tâche : …/tasks#pin-<id> ─────────────────────────
  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash
      if (!hash.startsWith('#pin-')) return
      selectPin(hash.substring(5))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    openFromHash()
    // Lien cliqué alors qu'on est déjà sur la page (depuis une discussion, par exemple).
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [selectPin])

  // ── Actions ───────────────────────────────────────────────────────────────
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportCount, setReportCount] = useState(0)
  const [exporting, setExporting] = useState(null)

  const handleDueDateUpdate = useCallback((pinId, date) => patchPin(pinId, { due_date: date }), [patchPin])
  const openPin = useCallback((pin) => selectPin(pin), [selectPin])

  const uploadPlanningImages = async (files) => {
    const uploadedUrls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `planning/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (error) {
        console.error('Planning image upload failed', error)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(data.path)
      uploadedUrls.push(publicUrl)
    }
    return uploadedUrls
  }

  const handleGenerateReport = async ({
    reportTitle, displayMode, participants, customSections, planningImageFiles, planningObservations,
  }) => {
    setIsReportModalOpen(false)
    setIsGeneratingReport(true)
    setReportCount(selectedCount)
    try {
      const selectedIds = await resolveSelectedIds()
      if (!selectedIds.length) throw new Error('Aucune tâche sélectionnée')
      setReportCount(selectedIds.length)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnectez-vous')

      const planningImages = planningImageFiles?.length ? await uploadPlanningImages(planningImageFiles) : []

      const response = await fetch(`${BACKEND_URL}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          selectedIds,
          fields: reportFields,
          displayMode,
          templateConfig: selectedTemplate?.config || null,
          reportTitle,
          participants,
          customSections,
          planningImages,
          planningObservations,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const { downloadUrl, fileName } = await response.json()
      if (!downloadUrl) throw new Error('URL de téléchargement manquante')

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName || 'rapport-taches.pdf'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Impossible de générer le rapport')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleExport = async (kind) => {
    if (exporting) return
    setExporting(kind)
    try {
      const ids = await resolveSelectedIds()
      if (!ids.length) return
      const withPhotos = kind === 'media'
      const rows = await fetchPinsByIds(ids, { withPhotos })
      await (withPhotos ? exportTasksWithMediaToExcel(rows) : exportTasksToExcel(rows))
    } catch (err) {
      console.error('Export failed', err)
      alert("L'export a échoué. Réessayez.")
    } finally {
      setExporting(null)
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskName.trim() || !profile?.id) return
    try {
      setIsCreating(true)
      const created = await insertPin({
        name: newTaskName,
        note: newTaskDescription,
        project_id: projectId,
        created_by: profile.id,
        category_id: categories.find((c) => c.order === 0)?.id,
        status_id: statuses.find((s) => s.order === 0)?.id,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      addPin(created)
      setNewTaskName('')
      setNewTaskDescription('')
      setIsAddTaskOpen(false)
    } catch (err) {
      console.error('Create task failed', err)
      alert('Erreur lors de la création de la tâche')
    } finally {
      setIsCreating(false)
    }
  }

  const isGuest = profile?.role === 'guest'

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-8 pt-6 pb-10 max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Liste des tâches</h1>
            <p className={clsx('text-[12px] text-mine-clair mt-0.5', 'tabular-nums')}>
              {isPending ? (
                <span className="inline-block h-3 w-24 bg-voile rounded-[3px] animate-pulse align-middle" />
              ) : (
                `${knownTotal} tâche${knownTotal > 1 ? 's' : ''}`
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mine-clair" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-48 rounded-[4px] border border-filet bg-white pl-8 pr-3 py-[7px] text-[13px] text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors"
              />
            </div>

            <PinFilterPanel variant="list" projectId={projectId} />

            {!isGuest && (
              <button
                onClick={() => setIsAddTaskOpen(true)}
                className="flex items-center gap-1.5 px-3 py-[7px] bg-encre text-white rounded-[4px] text-[13px] font-medium hover:bg-encre-survol transition-colors"
              >
                <span className="text-sm leading-none">+</span>
                Nouvelle tâche
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-filet rounded-[6px] overflow-hidden">
          {selectedCount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-survol border-b border-filet">
              <p className="text-[12px] font-medium text-encre">
                {selectedCount} tâche{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white text-mine rounded-[4px] text-[12px] font-medium border border-filet focus:outline-none focus:border-encre transition-colors"
                >
                  <option value="">Template par défaut</option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  disabled={isGeneratingReport}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors',
                    isGeneratingReport
                      ? 'bg-trait text-white cursor-not-allowed'
                      : 'bg-encre text-white hover:bg-encre-survol'
                  )}
                >
                  {isGeneratingReport
                    ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  {isGeneratingReport ? 'Génération…' : 'PDF'}
                </button>

                <button
                  onClick={() => handleExport('simple')}
                  disabled={Boolean(exporting)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-mine rounded-[4px] text-[12px] font-medium border border-filet hover:bg-survol disabled:opacity-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting === 'simple' ? 'Export…' : 'Excel'}
                </button>

                <button
                  onClick={() => handleExport('media')}
                  disabled={Boolean(exporting)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-mine rounded-[4px] text-[12px] font-medium border border-filet hover:bg-survol disabled:opacity-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting === 'media' ? 'Export…' : 'Excel + Médias'}
                </button>
              </div>
            </div>
          )}

          {isReportModalOpen && (
            <ReportFieldsModal
              fields={reportFields}
              setFields={setReportFields}
              onClose={() => setIsReportModalOpen(false)}
              onConfirm={handleGenerateReport}
              templateConfig={selectedTemplate?.config || null}
              projectMembers={projectMembers}
            />
          )}

          <div className={clsx('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-filet">
                  <th className="px-4 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={isPending || knownTotal === 0}
                      onChange={toggleSelectAll}
                      title="Sélectionner toutes les tâches correspondant aux filtres"
                      className="w-3.5 h-3.5 rounded-[2px] border-filet-fort accent-encre"
                    />
                  </th>
                  {TABLE_HEADERS.map((h) => (
                    <th
                      key={h}
                      className={clsx('px-4 py-2 text-left text-[11px] font-medium text-mine whitespace-nowrap', 'tabular-nums')}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isPending && Array.from({ length: 8 }).map((_, i) => <TaskRowSkeleton key={i} />)}

                {isError && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <p className="text-[13px] text-alerte mb-3">Impossible de charger les tâches.</p>
                      <button
                        onClick={() => refetch()}
                        className="px-3 py-1.5 text-[12px] font-medium border border-filet rounded-[4px] hover:bg-survol transition-colors"
                      >
                        Réessayer
                      </button>
                    </td>
                  </tr>
                )}

                {!isPending && !isError && pins.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <FileText className="w-10 h-10 text-voile mx-auto mb-3" />
                      <p className="text-[13px] text-mine-clair">Aucune tâche à afficher</p>
                    </td>
                  </tr>
                )}

                {pins.map((pin) => (
                  <TaskRow
                    key={pin.id}
                    pin={pin}
                    isSelected={isSelected(pin.id)}
                    organizationId={organizationId}
                    onOpen={openPin}
                    onToggleSelect={toggleSelect}
                    onDueDateUpdate={handleDueDateUpdate}
                  />
                ))}

                {isFetchingNextPage && Array.from({ length: 3 }).map((_, i) => <TaskRowSkeleton key={`next-${i}`} />)}
              </tbody>
            </table>

            {hasNextPage && (
              <div ref={sentinelRef} className="flex justify-center py-4 border-t border-voile">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className={clsx('text-[12px] text-mine hover:text-encre disabled:opacity-50 transition-colors', 'tabular-nums')}
                >
                  {isFetchingNextPage ? 'Chargement…' : `Charger plus (${pins.length} sur ${knownTotal})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPin && <PinDrawer organization_id={organizationId} />}

      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className={clsx(GeistSans.className, 'bg-white w-full max-w-md rounded-[6px] border border-filet shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)]')}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-voile">
              <h3 className="text-base font-medium text-encre">Nouvelle tâche</h3>
              <button onClick={() => setIsAddTaskOpen(false)} className="p-1 rounded-[3px] hover:bg-voile transition-colors">
                <XIcon className="w-4 h-4 text-mine-clair" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className={clsx('block text-[11px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>Nom</label>
                <input
                  type="text"
                  placeholder="Nom de la tâche"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full rounded-[4px] border border-filet bg-white px-3 py-2.5 text-[13px] text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className={clsx('block text-[11px] font-medium text-mine-clair mb-1.5', 'tabular-nums')}>
                  Description <span className="text-trait font-normal normal-case ml-1">(optionnel)</span>
                </label>
                <textarea
                  placeholder="Ajouter une description..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-[4px] border border-filet bg-white px-3 py-2.5 text-[13px] text-encre placeholder:text-trait focus:outline-none focus:border-encre resize-none transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-voile">
              <button onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 text-[13px] font-medium text-encre bg-white border border-filet rounded-[4px] hover:bg-survol transition-colors">
                Annuler
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isCreating || !newTaskName.trim()}
                className="px-4 py-2 bg-encre text-white rounded-[4px] text-[13px] font-medium hover:bg-encre-survol disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isGeneratingReport && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-encre text-white rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] border border-encre-survol">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium">Génération du rapport en cours…</p>
            <p className={clsx('text-[11px] text-trait mt-0.5', 'tabular-nums')}>
              Traitement de {reportCount} tâche{reportCount > 1 ? 's' : ''}, veuillez patienter.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
