'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { Outfit } from 'next/font/google'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, Trash2, Save, X, AlertCircle,
  CheckCircle2, Loader2, Clock, RefreshCw, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`
const outfit = Outfit({ subsets: ['latin'], display: 'swap' })
const API_URL = 'https://zaynbackend-production.up.railway.app'

const EMPTY_STATE = {
  file: null, uploading: false, processing: false, progress: 0,
  error: null, success: false, planId: null, estimatedTime: '',
  status: null, dimensionsChanged: false,
}

export default function ProjectPlans({ project, onClose }) {
  const [plans, setPlans] = useState([])
  const [editedNames, setEditedNames] = useState({})

  // Upload nouveau plan
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadState, setUploadState] = useState(EMPTY_STATE)

  // Update plan existant
  const [updateTarget, setUpdateTarget] = useState(null) // plan en cours de mise à jour
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateState, setUpdateState] = useState({ ...EMPTY_STATE, revisionLabel: '' })

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

      const response = await fetch(`${API_URL}/api/upload-pdf`, { method: 'POST', body: formData })
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

      const response = await fetch(`${API_URL}/api/update-plan`, { method: 'POST', body: formData })
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur mise à jour')

      await response.json()
      setUpdateState((p) => ({ ...p, uploading: false, processing: true, status: 'processing', planId: updateTarget.id }))

      // Tracking avec callback qui vérifie dimensions_changed
      startTracking(updateTarget.id, setUpdateState, updateRealtimeRef, updatePollingRef, async () => {
        await fetchPlans()
        // Après fetchPlans, vérifier si dimensions ont changé
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

    // Fallback polling après 5s
    setTimeout(() => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/upload-pdf/status/${planId}`)
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

  const deletePlan = async (plan) => {
    await supabase.rpc('soft_delete_plan', { p_plan_id: plan.id })
    await supabase.storage.from('project-plans').remove([plan.file_url])
    setPlans((p) => p.filter((pl) => pl.id !== plan.id))
  }

  const handleSaveAndClose = async () => {
    for (const [planId, name] of Object.entries(editedNames)) {
      await supabase.from('plans').update({ name }).eq('id', planId)
    }
    setPlans((prev) => prev.map((p) => (editedNames[p.id] ? { ...p, name: editedNames[p.id] } : p)))
    setEditedNames({})
    router.push(`${project.organization_id}/projects/${project.id}`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={clsx(outfit.className, 'bg-neutral-50')}>
      <div className="flex h-screen">

        {/* Side Panel */}
        <div className="w-1/4 border-r border-neutral-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">Plans du projet</h2>
              <button onClick={() => router.back()} className="p-1 rounded-md hover:bg-neutral-100">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <p className="text-[13px] text-neutral-400 mb-5 leading-relaxed">
              Gérez les plans PDF de votre projet. Le PDF sera automatiquement séparé en pages individuelles.
            </p>

            {/* Dropzone */}
            <div
              ref={dropRef}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e.dataTransfer.files[0]); setShowUploadModal(true) }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={clsx(
                'border-2 border-dashed rounded-lg p-6 flex flex-col items-center transition-all',
                dragActive ? 'bg-neutral-100 border-neutral-400' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50'
              )}
            >
              <div className={clsx('p-3 rounded-full mb-3', dragActive ? 'bg-neutral-200' : 'bg-neutral-100')}>
                <Upload className={clsx('w-6 h-6', dragActive ? 'text-neutral-900' : 'text-neutral-400')} />
              </div>
              <p className="text-center mb-1 text-[13px] font-medium text-neutral-900">Glissez-déposez un PDF ici</p>
              <p className="text-[11px] text-neutral-400 mb-3">Maximum 100 MB</p>
              <input type="file" accept="application/pdf" className="hidden" id="upload"
                onChange={(e) => { if (e.target.files[0]) { handleFileSelect(e.target.files[0]); setShowUploadModal(true) } }} />
              <label htmlFor="upload" className="px-3 py-1.5 bg-neutral-100 text-neutral-900 text-[12px] font-medium rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors">
                Parcourir les fichiers
              </label>
            </div>
          </div>

          <button onClick={handleSaveAndClose} className="bg-neutral-900 text-white px-4 py-2.5 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 mt-5">
            <Save className="w-4 h-4" /> Enregistrer et fermer
          </button>
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-auto bg-neutral-50 p-5 space-y-4">
          {plans.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-10 h-10 text-neutral-200 mb-3" />
              <h3 className="text-[14px] font-semibold text-neutral-900 mb-1">Aucun plan disponible</h3>
              <p className="text-[13px] text-neutral-400 max-w-sm">Commencez par ajouter un plan PDF depuis le panneau de gauche.</p>
            </div>
          )}
          {plans.map((plan) => {
            const publicUrl = supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl
            return (
              <div key={plan.id} className="border border-neutral-200 bg-white rounded-lg p-4 space-y-3 hover:border-neutral-300 transition-colors">
                <div className="flex justify-between items-center gap-3">
                  <input
                    className="border border-neutral-200 bg-white rounded-lg px-3 py-2 flex-1 text-[13px] text-neutral-900 font-medium focus:outline-none focus:border-neutral-400 transition-colors placeholder:text-neutral-300"
                    value={editedNames[plan.id] ?? plan.name}
                    onChange={(e) => setEditedNames((p) => ({ ...p, [plan.id]: e.target.value }))}
                    placeholder="Nom du plan"
                  />
                  <div className="flex items-center gap-1.5">
                    {/* Revision badge */}
                    {plan.revision_label && (
                      <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md border border-neutral-200">
                        {plan.revision_label}
                      </span>
                    )}
                    {/* Bouton Mettre à jour */}
                    <button
                      onClick={() => openUpdateModal(plan)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                      title="Mettre à jour le fichier"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {plans.length > 1 && (
                      <button onClick={() => deletePlan(plan)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                  <Document file={publicUrl}>
                    <Page pageNumber={1} width={800} renderTextLayer={false} renderAnnotationLayer={false} className="mx-auto" />
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
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Mettre à jour le plan</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {updateTarget?.name} · Le fichier actuel sera remplacé
                </p>
              </div>
              <button onClick={closeUpdateModal} disabled={updateState.uploading || updateState.processing}
                className="p-1 rounded-md hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Champ label révision */}
              {!updateState.success && !updateState.processing && !updateState.uploading && (
                <div>
                  <label className="block text-[12px] font-medium text-neutral-500 mb-1.5">Label de révision (optionnel)</label>
                  <input
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors placeholder:text-neutral-300"
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
                  <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-all">
                    <div className="p-3 bg-neutral-100 rounded-full w-fit mx-auto mb-3">
                      <Upload className="w-7 h-7 text-neutral-400" />
                    </div>
                    <p className="text-[13px] font-medium text-neutral-900 mb-1">Cliquez pour sélectionner le nouveau PDF</p>
                    <p className="text-[11px] text-neutral-400">Maximum 100 MB</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  {/* File info */}
                  {updateState.file && (
                    <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="p-2 bg-neutral-100 rounded-lg">
                        <FileText className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">{updateState.file.name}</p>
                        <p className="text-[11px] text-neutral-400">{formatFileSize(updateState.file.size)}</p>
                      </div>
                      {!updateState.uploading && !updateState.processing && !updateState.success && (
                        <button onClick={() => setUpdateState((p) => ({ ...p, file: null }))} className="p-1 rounded-md hover:bg-neutral-100">
                          <X className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Uploading */}
                  {updateState.uploading && (
                    <div className="space-y-2">
                      <span className="text-[12px] text-neutral-400 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...
                      </span>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900 animate-pulse rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Processing */}
                  {updateState.processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-neutral-400 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération des tiles...
                        </span>
                        <span className="text-neutral-900 font-medium">{updateState.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900 transition-all duration-300 rounded-full" style={{ width: `${updateState.progress}%` }} />
                      </div>
                      {updateState.estimatedTime && (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <Clock className="w-3 h-3" /> Temps estimé: {updateState.estimatedTime}
                        </div>
                      )}
                      <p className="text-[11px] text-neutral-500 text-center bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">
                        Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {updateState.success && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-neutral-900 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900">Plan mis à jour avec succès</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">Les nouvelles tiles ont été générées.</p>
                        </div>
                      </div>

                      {/* Warning dimensions */}
                      {updateState.dimensionsChanged && (
                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[13px] font-medium text-amber-700">Dimensions modifiées</p>
                            <p className="text-[11px] text-amber-600 mt-0.5">
                              Le nouveau plan a des dimensions différentes. Vérifiez le positionnement des épingles existantes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {updateState.error && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-medium text-red-600">Erreur</p>
                        <p className="text-[11px] text-red-500 mt-0.5">{updateState.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100">
              <button onClick={closeUpdateModal} disabled={updateState.uploading || updateState.processing}
                className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {updateState.success ? 'Fermer' : 'Annuler'}
              </button>
              {updateState.file && !updateState.success && !updateState.error && !updateState.processing && (
                <button onClick={handleUpdate} disabled={updateState.uploading}
                  className="px-4 py-2 text-[13px] font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                  {updateState.uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</> : <><RefreshCw className="w-3.5 h-3.5" /> Mettre à jour</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Upload (inchangé) ── */}
     
    </div>
  )
}

// ── Modal Upload (composant extrait pour clarté) ────────────────────────────
function UploadModalContent({ show, state, onClose, onFileSelect, onUpload, onReset, formatFileSize }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-xl w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Importer un fichier PDF</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Division automatique en pages · Maximum 100 MB</p>
          </div>
          <button onClick={onClose} disabled={state.uploading || state.processing} className="p-1 rounded-md hover:bg-neutral-100 disabled:opacity-40">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!state.file && !state.error ? (
            <label className="block">
              <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]) }} className="hidden" />
              <div className="border-2 border-dashed border-neutral-200 rounded-lg p-10 text-center cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-all">
                <div className="p-3 bg-neutral-100 rounded-full w-fit mx-auto mb-3">
                  <Upload className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-[13px] font-medium text-neutral-900 mb-1">Cliquez pour sélectionner un fichier</p>
                <p className="text-[11px] text-neutral-400">ou glissez-déposez votre PDF ici</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              {state.file && (
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="p-2 bg-neutral-100 rounded-lg"><FileText className="w-5 h-5 text-neutral-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-900 truncate">{state.file.name}</p>
                    <p className="text-[11px] text-neutral-400">{formatFileSize(state.file.size)}</p>
                  </div>
                  {!state.uploading && !state.processing && !state.success && (
                    <button onClick={onReset} className="p-1 rounded-md hover:bg-neutral-100"><X className="w-3.5 h-3.5 text-neutral-400" /></button>
                  )}
                </div>
              )}
              {state.uploading && (
                <div className="space-y-2">
                  <span className="text-[12px] text-neutral-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...</span>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-neutral-900 animate-pulse rounded-full" /></div>
                </div>
              )}
              {state.processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-neutral-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération des tiles...</span>
                    <span className="text-neutral-900 font-medium">{state.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-900 transition-all duration-300 rounded-full" style={{ width: `${state.progress}%` }} />
                  </div>
                  {state.estimatedTime && <div className="flex items-center gap-1.5 text-[11px] text-neutral-400"><Clock className="w-3 h-3" /> Temps estimé: {state.estimatedTime}</div>}
                  <p className="text-[11px] text-neutral-500 text-center bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.</p>
                </div>
              )}
              {state.success && (
                <div className="flex items-start gap-2.5 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-neutral-900">PDF traité avec succès</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Les pages ont été générées et sont maintenant disponibles.</p>
                  </div>
                </div>
              )}
              {state.error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div><p className="text-[13px] font-medium text-red-600">Erreur</p><p className="text-[11px] text-red-500 mt-0.5">{state.error}</p></div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100">
          <button onClick={onClose} disabled={state.uploading || state.processing} className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40">
            {state.success ? 'Fermer' : state.processing ? 'Fermer' : 'Annuler'}
          </button>
          {state.file && !state.success && !state.error && !state.processing && (
            <button onClick={onUpload} disabled={state.uploading} className="px-4 py-2 text-[13px] font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-1.5">
              {state.uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</> : <><Upload className="w-3.5 h-3.5" /> Télécharger</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}