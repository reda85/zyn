'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, Trash2, Save, X, AlertCircle,
  CheckCircle2, Loader2, Clock, RefreshCw, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { backendFetch } from '@/lib/backend'
import { useRefreshOnLeave } from '@/hooks/useRefreshOnLeave'
import { qk } from '@/lib/data/keys'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const EMPTY_STATE = {
  file: null, uploading: false, processing: false, progress: 0,
  error: null, success: false, planId: null, estimatedTime: '',
  status: null, dimensionsChanged: false,
}

export default function ProjectPlans({ project, onClose }) {
  const [plans, setPlans] = useState([])
  const [editedNames, setEditedNames] = useState({})
  // Plans ajoutés, renommés ou supprimés ici : le projet en cache est relu en sortant.
  useRefreshOnLeave(qk.project(project?.id), qk.pinsRoot, ['projects'])

  // Upload nouveau plan
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadState, setUploadState] = useState(EMPTY_STATE)

  // Update plan existant
  const [updateTarget, setUpdateTarget] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateState, setUpdateState] = useState({ ...EMPTY_STATE, revisionLabel: '' })

  // Delete plan existant
  const [planToDelete, setPlanToDelete] = useState(null)
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState(false)

  const [dragActive, setDragActive] = useState(false)
  const dropRef = useRef(null)
  const router = useRouter()
  const pollingRef = useRef(null)
  const realtimeRef = useRef(null)
  const updatePollingRef = useRef(null)
  const updateRealtimeRef = useRef(null)

  useEffect(() => {
    if (!project?.id) return
    fetchPlans()
  }, [project.id])

  useEffect(() => {
    return () => {
      cleanupRealtime(realtimeRef, pollingRef)
      cleanupRealtime(updateRealtimeRef, updatePollingRef)
    }
  }, [])

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans').select('*')
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (!error) setPlans(data || [])
  }

  const cleanupRealtime = (rtRef, pollRef) => {
    if (rtRef.current) supabase.removeChannel(rtRef.current)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  // ─── Upload nouveau plan ────────────────────────────────────────────────────

  const handleFileSelect = (file, forUpdate = false) => {
    if (!file) return
    const setState = forUpdate ? setUpdateState : setUploadState

    if (file.type !== 'application/pdf') {
      setState((p) => ({ ...p, error: 'Seuls les fichiers PDF sont acceptés' }))
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setState((p) => ({ ...p, error: 'La taille du fichier ne doit pas dépasser 100 MB' }))
      return
    }
    setState((p) => ({ ...p, file, error: null }))
  }

  const handleUpload = async () => {
    if (!uploadState.file) return
    setUploadState((p) => ({ ...p, uploading: true, progress: 0, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)
      formData.append('projectId', project.id)

      const response = await backendFetch(`/api/upload-pdf`, { method: 'POST', body: formData })
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur upload')

      const result = await response.json()
      setUploadState((p) => ({ ...p, uploading: false, processing: true, planId: result.planId, estimatedTime: result.estimatedTime, status: 'processing' }))
      startTracking(result.planId, setUploadState, realtimeRef, pollingRef, fetchPlans)
    } catch (err) {
      setUploadState((p) => ({ ...p, uploading: false, processing: false, error: err.message }))
    }
  }

  // ─── Update plan existant ───────────────────────────────────────────────────

  const openUpdateModal = (plan) => {
    setUpdateTarget(plan)
    setUpdateState({ ...EMPTY_STATE, revisionLabel: '' })
    setShowUpdateModal(true)
  }

  const closeUpdateModal = () => {
    if (updateState.uploading || updateState.processing) return
    setShowUpdateModal(false)
    setUpdateTarget(null)
    cleanupRealtime(updateRealtimeRef, updatePollingRef)
    setTimeout(() => setUpdateState({ ...EMPTY_STATE, revisionLabel: '' }), 300)
  }

  const handleUpdate = async () => {
    if (!updateState.file || !updateTarget) return
    setUpdateState((p) => ({ ...p, uploading: true, progress: 0, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', updateState.file)
      formData.append('planId', updateTarget.id)
      formData.append('revisionLabel', updateState.revisionLabel)

      const response = await backendFetch(`/api/update-plan`, { method: 'POST', body: formData })
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur mise à jour')

      await response.json()
      setUpdateState((p) => ({ ...p, uploading: false, processing: true, status: 'processing', planId: updateTarget.id }))

      startTracking(updateTarget.id, setUpdateState, updateRealtimeRef, updatePollingRef, async () => {
        await fetchPlans()
        const { data } = await supabase.from('plans').select('dimensions_changed').eq('id', updateTarget.id).single()
        if (data?.dimensions_changed) {
          setUpdateState((p) => ({ ...p, dimensionsChanged: true }))
        }
      })
    } catch (err) {
      setUpdateState((p) => ({ ...p, uploading: false, processing: false, error: err.message }))
    }
  }

  // ─── Tracking générique (realtime + polling) ────────────────────────────────

  const startTracking = (planId, setState, rtRef, pollRef, onSuccess) => {
    if (rtRef.current) supabase.removeChannel(rtRef.current)

    const channel = supabase.channel(`plan:${planId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plans', filter: `id=eq.${planId}` },
        (payload) => {
          const { status, processing_progress } = payload.new
          setState((p) => ({ ...p, progress: processing_progress || 0, status }))
          if (status === 'ready') {
            setState((p) => ({ ...p, processing: false, success: true }))
            onSuccess?.()
            supabase.removeChannel(channel)
          } else if (status === 'failed') {
            setState((p) => ({ ...p, processing: false, error: payload.new.error_message || 'Erreur traitement' }))
            supabase.removeChannel(channel)
          }
        })
      .subscribe()
    rtRef.current = channel

    setTimeout(() => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await backendFetch(`/api/upload-pdf/status/${planId}`)
          const data = await res.json()
          setState((p) => ({ ...p, progress: data.processing_progress || 0, status: data.status }))
          if (data.status === 'ready' || data.status === 'failed') {
            clearInterval(pollRef.current)
            if (data.status === 'ready') {
              setState((p) => ({ ...p, processing: false, success: true }))
              onSuccess?.()
            } else {
              setState((p) => ({ ...p, processing: false, error: data.error_message || 'Erreur traitement' }))
            }
          }
        } catch (e) { console.error('Polling error:', e) }
      }, 3000)
    }, 5000)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'Ko', 'Mo']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // ─── Delete plan (avec confirmation) ─────────────────────────────────────────

  const openDeletePlanModal = (plan) => {
    setPlanToDelete(plan)
    setShowDeletePlanModal(true)
  }

  const closeDeletePlanModal = () => {
    if (deletingPlan) return
    setShowDeletePlanModal(false)
    setPlanToDelete(null)
  }

  const confirmDeletePlan = async () => {
    if (!planToDelete) return
    setDeletingPlan(true)
    try {
      await supabase.rpc('soft_delete_plan', { p_plan_id: planToDelete.id })
      await supabase.storage.from('project-plans').remove([planToDelete.file_url])
      setPlans((p) => p.filter((pl) => pl.id !== planToDelete.id))
      setShowDeletePlanModal(false)
      setPlanToDelete(null)
    } catch (err) {
      console.error('Erreur suppression plan', err)
    } finally {
      setDeletingPlan(false)
    }
  }

  const handleSaveAndClose = async () => {
    for (const [planId, name] of Object.entries(editedNames)) {
      await supabase.from('plans').update({ name }).eq('id', planId)
    }
    setPlans((prev) => prev.map((p) => (editedNames[p.id] ? { ...p, name: editedNames[p.id] } : p)))
    setEditedNames({})
    router.push(`/${project.organization_id}/projects/${project.id}`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={clsx(GeistSans.className, 'bg-stone-50')}>
      <div className="flex h-screen">

        {/* Side Panel */}
        <div className="w-1/4 border-r border-stone-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-stone-950">Plans du projet</h2>
              <button onClick={() => router.back()} className="p-1 rounded-[3px] hover:bg-stone-100">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
            <p className="text-[13px] text-stone-500 mb-5 leading-relaxed">
              Gérez les plans PDF de votre projet. Le PDF sera automatiquement séparé en pages individuelles.
            </p>

            {/* Dropzone */}
            <div
              ref={dropRef}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e.dataTransfer.files[0]); setShowUploadModal(true) }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={clsx(
                'border-2 border-dashed rounded-[4px] p-6 flex flex-col items-center transition-colors',
                dragActive ? 'bg-stone-100 border-stone-500' : 'border-stone-200 hover:border-stone-300 bg-stone-100'
              )}
            >
              <div className={clsx('p-3 rounded-full mb-3', dragActive ? 'bg-stone-200' : 'bg-stone-100')}>
                <Upload className={clsx('w-6 h-6', dragActive ? 'text-stone-950' : 'text-stone-500')} />
              </div>
              <p className="text-center mb-1 text-[13px] font-medium text-stone-950">Glissez-déposez un PDF ici</p>
              <p className="text-[11px] text-stone-500 mb-3">Maximum 100 MB</p>
              <input type="file" accept="application/pdf" className="hidden" id="upload"
                onChange={(e) => { if (e.target.files[0]) { handleFileSelect(e.target.files[0]); setShowUploadModal(true) } }} />
              <label htmlFor="upload" className="px-3 py-1.5 bg-stone-100 text-stone-950 text-[12px] font-medium rounded-[4px] cursor-pointer hover:bg-stone-200 transition-colors">
                Parcourir les fichiers
              </label>
            </div>
          </div>

          <button onClick={handleSaveAndClose} className="bg-stone-950 text-white px-4 py-2.5 rounded-[4px] text-[13px] font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 mt-5">
            <Save className="w-4 h-4" /> Enregistrer et fermer
          </button>
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-auto bg-stone-50 p-5 space-y-4">
          {plans.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-9 h-9 text-stone-100 mb-3" />
              <h3 className="text-[14px] font-medium text-stone-950 mb-1">Aucun plan disponible</h3>
              <p className="text-[13px] text-stone-500 max-w-sm">Commencez par ajouter un plan PDF depuis le panneau de gauche.</p>
            </div>
          )}
          {plans.map((plan) => {
            const publicUrl = supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl
            return (
              <div key={plan.id} className="border border-stone-200 bg-white rounded-[4px] p-4 space-y-3 hover:border-stone-300 transition-colors">
                <div className="flex justify-between items-center gap-3">
                  <input
                    className="border border-stone-200 bg-white rounded-[4px] px-3 py-2 flex-1 text-[13px] text-stone-950 font-medium focus:outline-none focus:border-stone-950 transition-colors placeholder:text-stone-400"
                    value={editedNames[plan.id] ?? plan.name}
                    onChange={(e) => setEditedNames((p) => ({ ...p, [plan.id]: e.target.value }))}
                    placeholder="Nom du plan"
                  />
                  <div className="flex items-center gap-1.5">
                    {/* Revision badge */}
                    {plan.revision_label && (
                      <span className={clsx('text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-[3px] border border-stone-200', GeistMono.className)}>
                        {plan.revision_label}
                      </span>
                    )}
                    {/* Bouton Mettre à jour */}
                    <button
                      onClick={() => openUpdateModal(plan)}
                      className="p-1.5 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-[3px] transition-colors"
                      title="Mettre à jour le fichier"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {plans.length > 1 && (
                      <button onClick={() => openDeletePlanModal(plan)} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-[3px] transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="border border-stone-200 rounded-[4px] overflow-hidden bg-stone-100">
                  <Document
                    file={publicUrl}
                    loading={
                      <div className="flex flex-col items-center justify-center gap-2 py-16">
                        <Loader2 className="w-5 h-5 text-stone-500 animate-spin" />
                        <p className="text-[13px] text-stone-500">Chargement du PDF…</p>
                      </div>
                    }
                    error={
                      <div className="flex flex-col items-center justify-center gap-2 py-16">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-[13px] text-red-800">Impossible de charger le PDF</p>
                      </div>
                    }
                    noData={
                      <div className="flex flex-col items-center justify-center gap-2 py-16">
                        <FileText className="w-5 h-5 text-stone-500" />
                        <p className="text-[13px] text-stone-500">Aucun fichier à afficher</p>
                      </div>
                    }
                  >
                    <Page
                      language="fr"
                      pageNumber={1}
                      width={800}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="mx-auto"
                      loading={
                        <div className="flex items-center justify-center py-16">
                          <Loader2 className="w-5 h-5 text-stone-500 animate-spin" />
                        </div>
                      }
                    />
                  </Document>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal Upload nouveau plan ── */}
      <UploadModalContent
        show={showUploadModal}
        state={uploadState}
        onClose={() => { if (!uploadState.uploading && !uploadState.processing) { setShowUploadModal(false); setTimeout(() => setUploadState(EMPTY_STATE), 300) } }}
        onFileSelect={(f) => handleFileSelect(f, false)}
        onUpload={handleUpload}
        onReset={() => setUploadState(EMPTY_STATE)}
        formatFileSize={formatFileSize}
        title="Importer un fichier PDF"
        subtitle="Division automatique en pages · Maximum 100 MB"
      />

      {/* ── Modal Update plan existant ── */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-stone-200 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-medium text-stone-950">Mettre à jour le plan</h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {updateTarget?.name} · Le fichier actuel sera remplacé
                </p>
              </div>
              <button onClick={closeUpdateModal} disabled={updateState.uploading || updateState.processing}
                className="p-1 rounded-[3px] hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Champ label révision */}
              {!updateState.success && !updateState.processing && !updateState.uploading && (
                <div>
                  <label className={clsx('block text-[11px] font-medium text-stone-500 uppercase tracking-[0.08em] mb-1.5', GeistMono.className)}>Label de révision (optionnel)</label>
                  <input
                    className="w-full border border-stone-200 rounded-[4px] px-3 py-2 text-[13px] text-stone-950 focus:outline-none focus:border-stone-950 transition-colors placeholder:text-stone-400"
                    placeholder="Ex : Rev B, Émission DCE, V2..."
                    value={updateState.revisionLabel}
                    onChange={(e) => setUpdateState((p) => ({ ...p, revisionLabel: e.target.value }))}
                  />
                </div>
              )}

              {/* Sélection fichier */}
              {!updateState.file && !updateState.error ? (
                <label className="block">
                  <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) handleFileSelect(e.target.files[0], true) }} className="hidden" />
                  <div className="border-2 border-dashed border-stone-200 rounded-[4px] p-8 text-center cursor-pointer hover:border-stone-300 hover:bg-stone-100 transition-all">
                    <div className="p-3 bg-stone-100 rounded-full w-fit mx-auto mb-3">
                      <Upload className="w-7 h-7 text-stone-500" />
                    </div>
                    <p className="text-[13px] font-medium text-stone-950 mb-1">Cliquez pour sélectionner le nouveau PDF</p>
                    <p className="text-[11px] text-stone-500">Maximum 100 MB</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  {/* File info */}
                  {updateState.file && (
                    <div className="flex items-start gap-3 p-3 bg-stone-100 rounded-[4px] border border-stone-200">
                      <div className="p-2 bg-stone-100 rounded-[4px]">
                        <FileText className="w-5 h-5 text-stone-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-stone-950 truncate">{updateState.file.name}</p>
                        <p className={clsx('text-[11px] text-stone-500', GeistMono.className)}>{formatFileSize(updateState.file.size)}</p>
                      </div>
                      {!updateState.uploading && !updateState.processing && !updateState.success && (
                        <button onClick={() => setUpdateState((p) => ({ ...p, file: null }))} className="p-1 rounded-[3px] hover:bg-stone-100">
                          <X className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Uploading */}
                  {updateState.uploading && (
                    <div className="space-y-2">
                      <span className="text-[12px] text-stone-500 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...
                      </span>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-stone-950 animate-pulse rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Processing */}
                  {updateState.processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-stone-500 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération des tiles...
                        </span>
                        <span className={clsx('text-stone-950 font-medium', GeistMono.className)}>{updateState.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-stone-950 transition-all duration-300 rounded-full" style={{ width: `${updateState.progress}%` }} />
                      </div>
                      {updateState.estimatedTime && (
                        <div className={clsx('flex items-center gap-1.5 text-[11px] text-stone-500', GeistMono.className)}>
                          <Clock className="w-3 h-3" /> Temps estimé: {updateState.estimatedTime}
                        </div>
                      )}
                      <p className="text-[11px] text-stone-600 text-center bg-stone-100 border border-stone-200 rounded-[4px] p-2.5">
                        Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {updateState.success && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-[4px]">
                        <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[13px] font-medium text-green-700">Plan mis à jour avec succès</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">Les nouvelles tiles ont été générées.</p>
                        </div>
                      </div>

                      {/* Warning dimensions */}
                      {updateState.dimensionsChanged && (
                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-[4px]">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[13px] font-medium text-amber-700">Dimensions modifiées</p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              Le nouveau plan a des dimensions différentes. Vérifiez le positionnement des épingles existantes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {updateState.error && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-[4px]">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-medium text-red-800">Erreur</p>
                        <p className="text-[11px] text-red-800 mt-0.5">{updateState.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
              <button onClick={closeUpdateModal} disabled={updateState.uploading || updateState.processing}
                className="px-4 py-2 text-[13px] font-medium text-stone-700 bg-stone-100 rounded-[4px] hover:bg-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {updateState.success ? 'Fermer' : 'Annuler'}
              </button>
              {updateState.file && !updateState.success && !updateState.error && !updateState.processing && (
                <button onClick={handleUpdate} disabled={updateState.uploading}
                  className="px-4 py-2 text-[13px] font-medium bg-stone-950 text-white rounded-[4px] hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                  {updateState.uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</> : <><RefreshCw className="w-3.5 h-3.5" /> Mettre à jour</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Delete plan (confirmation) ── */}
      {showDeletePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20" onClick={closeDeletePlanModal} />

          <div className="relative bg-white border border-stone-200 rounded-[6px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-md w-full p-6">
            <button
              onClick={closeDeletePlanModal}
              disabled={deletingPlan}
              className="absolute top-4 right-4 p-1 rounded-[3px] hover:bg-stone-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>

            <h2 className="text-base font-medium text-stone-950 mb-1">
              Supprimer le plan
            </h2>
            <p className="text-[13px] text-stone-600 mb-5">
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="font-medium text-stone-950">"{planToDelete?.name}"</span> ?
              Les pins associées à ce plan perdront leur positionnement. Cette action est irréversible.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeDeletePlanModal}
                disabled={deletingPlan}
                className="px-4 py-2 text-[13px] font-medium text-stone-700 bg-stone-100 rounded-[4px] hover:bg-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeletePlan}
                disabled={deletingPlan}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 rounded-[4px] hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {deletingPlan ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Suppression...</> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal Upload (composant extrait pour clarté) ────────────────────────────
function UploadModalContent({ show, state, onClose, onFileSelect, onUpload, onReset, formatFileSize }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[6px] border border-stone-200 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-xl w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-medium text-stone-950">Importer un fichier PDF</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">Division automatique en pages · Maximum 100 MB</p>
          </div>
          <button onClick={onClose} disabled={state.uploading || state.processing} className="p-1 rounded-[3px] hover:bg-stone-100 disabled:opacity-40">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!state.file && !state.error ? (
            <label className="block">
              <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]) }} className="hidden" />
              <div className="border-2 border-dashed border-stone-200 rounded-[4px] p-10 text-center cursor-pointer hover:border-stone-300 hover:bg-stone-100 transition-all">
                <div className="p-3 bg-stone-100 rounded-full w-fit mx-auto mb-3">
                  <Upload className="w-8 h-8 text-stone-500" />
                </div>
                <p className="text-[13px] font-medium text-stone-950 mb-1">Cliquez pour sélectionner un fichier</p>
                <p className="text-[11px] text-stone-500">ou glissez-déposez votre PDF ici</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              {state.file && (
                <div className="flex items-start gap-3 p-3 bg-stone-100 rounded-[4px] border border-stone-200">
                  <div className="p-2 bg-stone-100 rounded-[4px]"><FileText className="w-5 h-5 text-stone-700" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-stone-950 truncate">{state.file.name}</p>
                    <p className={clsx('text-[11px] text-stone-500', GeistMono.className)}>{formatFileSize(state.file.size)}</p>
                  </div>
                  {!state.uploading && !state.processing && !state.success && (
                    <button onClick={onReset} className="p-1 rounded-[3px] hover:bg-stone-100"><X className="w-3.5 h-3.5 text-stone-500" /></button>
                  )}
                </div>
              )}
              {state.uploading && (
                <div className="space-y-2">
                  <span className="text-[12px] text-stone-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...</span>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-stone-950 animate-pulse rounded-full" /></div>
                </div>
              )}
              {state.processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-stone-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération des tiles...</span>
                    <span className={clsx('text-stone-950 font-medium', GeistMono.className)}>{state.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-950 transition-all duration-300 rounded-full" style={{ width: `${state.progress}%` }} />
                  </div>
                  {state.estimatedTime && <div className={clsx('flex items-center gap-1.5 text-[11px] text-stone-500', GeistMono.className)}><Clock className="w-3 h-3" /> Temps estimé: {state.estimatedTime}</div>}
                  <p className="text-[11px] text-stone-600 text-center bg-stone-100 border border-stone-200 rounded-[4px] p-2.5">Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.</p>
                </div>
              )}
              {state.success && (
                <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-[4px]">
                  <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-green-700">PDF traité avec succès</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Les pages ont été générées et sont maintenant disponibles.</p>
                  </div>
                </div>
              )}
              {state.error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-[4px]">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div><p className="text-[13px] font-medium text-red-800">Erreur</p><p className="text-[11px] text-red-800 mt-0.5">{state.error}</p></div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} disabled={state.uploading || state.processing} className="px-4 py-2 text-[13px] font-medium text-stone-700 bg-stone-100 rounded-[4px] hover:bg-stone-300 transition-colors disabled:opacity-40">
            {state.success ? 'Fermer' : state.processing ? 'Fermer' : 'Annuler'}
          </button>
          {state.file && !state.success && !state.error && !state.processing && (
            <button onClick={onUpload} disabled={state.uploading} className="px-4 py-2 text-[13px] font-medium bg-stone-950 text-white rounded-[4px] hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center gap-1.5">
              {state.uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</> : <><Upload className="w-3.5 h-3.5" /> Télécharger</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}