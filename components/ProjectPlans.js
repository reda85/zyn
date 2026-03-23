'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { Outfit } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, Save, X, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react'
import clsx from 'clsx'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

const API_URL = 'https://zaynbackend-production.up.railway.app'

export default function ProjectPlans({ project, onClose }) {
  const [plans, setPlans] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadState, setUploadState] = useState({
    file: null,
    uploading: false,
    processing: false,
    progress: 0,
    error: null,
    success: false,
    planId: null,
    jobId: null,
    estimatedTime: '',
    status: null,
  })
  const [dragActive, setDragActive] = useState(false)
  const dropRef = useRef(null)
  const router = useRouter()
  const pollingIntervalRef = useRef(null)
  const realtimeChannelRef = useRef(null)

  useEffect(() => {
    if (!project?.id) return
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', project.id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      if (error) console.error('Error fetching plans:', error)
      else setPlans(data || [])
    }
    fetchPlans()
  }, [project.id])

  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current)
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  const [editedNames, setEditedNames] = useState({})

  const handleNameChange = (planId, value) => {
    setEditedNames((prev) => ({ ...prev, [planId]: value }))
  }

  const handleFileSelect = (file) => {
    if (!file) return

    if (file.type !== 'application/pdf') {
      setUploadState({
        file: null, uploading: false, processing: false, progress: 0,
        error: 'Seuls les fichiers PDF sont acceptés',
        success: false, planId: null, jobId: null, estimatedTime: '', status: null,
      })
      setShowUploadModal(true)
      return
    }

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadState({
        file: null, uploading: false, processing: false, progress: 0,
        error: 'La taille du fichier ne doit pas dépasser 100 MB',
        success: false, planId: null, jobId: null, estimatedTime: '', status: null,
      })
      setShowUploadModal(true)
      return
    }

    setUploadState({
      file, uploading: false, processing: false, progress: 0,
      error: null, success: false, planId: null, jobId: null, estimatedTime: '', status: null,
    })
    setShowUploadModal(true)
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const startRealtimeTracking = (planId) => {
    if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current)

    const channel = supabase
      .channel(`plan:${planId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plans', filter: `id=eq.${planId}` },
        (payload) => {
          const { status, processing_progress } = payload.new
          setUploadState((prev) => ({ ...prev, progress: processing_progress || 0, status }))

          if (status === 'ready') {
            setUploadState((prev) => ({ ...prev, processing: false, success: true }))
            fetchPlansAfterProcessing()
            supabase.removeChannel(channel)
          } else if (status === 'failed') {
            setUploadState((prev) => ({ ...prev, processing: false, error: payload.new.error_message || 'Erreur lors du traitement' }))
            supabase.removeChannel(channel)
          }
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel
  }

  const startPolling = (planId) => {
    const timeoutId = setTimeout(() => {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/upload-pdf/status/${planId}`)
          const data = await response.json()
          setUploadState((prev) => ({ ...prev, progress: data.processing_progress || 0, status: data.status }))

          if (data.status === 'ready' || data.status === 'failed') {
            clearInterval(pollingIntervalRef.current)
            if (data.status === 'ready') {
              setUploadState((prev) => ({ ...prev, processing: false, success: true }))
              fetchPlansAfterProcessing()
            } else {
              setUploadState((prev) => ({ ...prev, processing: false, error: data.error_message || 'Erreur lors du traitement' }))
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 3000)
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }

  const fetchPlansAfterProcessing = async () => {
    const { data: allPlans, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (!fetchError) setPlans(allPlans)
  }

  const handleUpload = async () => {
    if (!uploadState.file) return
    setUploadState((prev) => ({ ...prev, uploading: true, progress: 0, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)
      formData.append('projectId', project.id)

      const response = await fetch(`${API_URL}/api/upload-pdf`, { method: 'POST', body: formData })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du téléchargement')
      }

      const result = await response.json()
      setUploadState((prev) => ({
        ...prev, uploading: false, processing: true, planId: result.planId,
        jobId: result.jobId, estimatedTime: result.estimatedTime, status: 'processing', progress: 0,
      }))

      startRealtimeTracking(result.planId)
      startPolling(result.planId)
    } catch (error) {
      setUploadState((prev) => ({ ...prev, uploading: false, processing: false, error: error.message, progress: 0 }))
    }
  }

  const resetUpload = () => {
    if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current)
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    setUploadState({
      file: null, uploading: false, processing: false, progress: 0,
      error: null, success: false, planId: null, jobId: null, estimatedTime: '', status: null,
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'Ko', 'Mo']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const deletePlan = async (plan) => {
    const { error } = await supabase.rpc('soft_delete_plan', { p_plan_id: plan.id })
    if (error) console.error('Error deleting plan:', error)
    await supabase.storage.from('project-plans').remove([plan.file_url])
    setPlans(plans.filter((p) => p.id !== plan.id))
  }

  const handleSaveAndClose = async () => {
    const updates = Object.entries(editedNames)
    for (const [planId, name] of updates) {
      await supabase.from('plans').update({ name }).eq('id', planId)
    }
    setPlans((prev) =>
      prev.map((plan) => (editedNames[plan.id] ? { ...plan, name: editedNames[plan.id] } : plan))
    )
    setEditedNames({})
    router.push(`${project.organization_id}/projects/${project.id}`)
  }

  const closeModal = () => {
    if (!uploadState.uploading && !uploadState.processing) {
      setShowUploadModal(false)
      setTimeout(resetUpload, 300)
    }
  }

  return (
    <div className={clsx(outfit.className, 'bg-neutral-50')}>
      <div className="flex h-screen">
        {/* ── Side Panel ── */}
        <div className="w-1/4 border-r border-neutral-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">Plans du projet</h2>
              <button
                onClick={() => router.back()}
                className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <p className="text-[13px] text-neutral-400 mb-5 leading-relaxed">
              Gérez les plans PDF de votre projet. Le PDF sera automatiquement séparé en pages individuelles.
            </p>

            {/* Dropzone */}
            <div
              ref={dropRef}
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={clsx(
                'border-2 border-dashed rounded-lg p-6 flex flex-col justify-center items-center transition-all',
                dragActive
                  ? 'bg-neutral-100 border-neutral-400'
                  : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50'
              )}
            >
              <div className={clsx(
                'p-3 rounded-full mb-3 transition-all',
                dragActive ? 'bg-neutral-200' : 'bg-neutral-100'
              )}>
                <Upload className={clsx(
                  'w-6 h-6 transition-colors',
                  dragActive ? 'text-neutral-900' : 'text-neutral-400'
                )} />
              </div>
              <p className="text-center mb-1 text-[13px] font-medium text-neutral-900">
                Glissez-déposez un PDF ici
              </p>
              <p className="text-[11px] text-neutral-400 mb-3">
                Maximum 100 MB
              </p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="upload"
                onChange={(e) => {
                  const f = e.target.files[0]
                  if (f) handleFileSelect(f)
                }}
              />
              <label
                htmlFor="upload"
                className="px-3 py-1.5 bg-neutral-100 text-neutral-900 text-[12px] font-medium rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
              >
                Parcourir les fichiers
              </label>
            </div>
          </div>

          {/* Save & Close */}
          <button
            onClick={handleSaveAndClose}
            className="bg-neutral-900 text-white px-4 py-2.5 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 mt-5"
          >
            <Save className="w-4 h-4" />
            Enregistrer et fermer
          </button>
        </div>

        {/* ── Main Panel: Plans List ── */}
        <div className="flex-1 overflow-auto bg-neutral-50 p-5 space-y-4">
          {plans.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-10 h-10 text-neutral-200 mb-3" />
              <h3 className="text-[14px] font-semibold text-neutral-900 mb-1">
                Aucun plan disponible
              </h3>
              <p className="text-[13px] text-neutral-400 max-w-sm">
                Commencez par ajouter un plan PDF depuis le panneau de gauche.
              </p>
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
                    onChange={(e) => handleNameChange(plan.id, e.target.value)}
                    placeholder="Nom du plan"
                  />
                  {plans.length > 1 && (
                    <button
                      onClick={() => deletePlan(plan)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Importer un fichier PDF</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Division automatique en pages · Maximum 100 MB
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={uploadState.uploading || uploadState.processing}
                className="p-1 rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {!uploadState.file && !uploadState.error ? (
                <label className="block">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files[0]
                      if (f) handleFileSelect(f)
                    }}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-neutral-200 rounded-lg p-10 text-center cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-all">
                    <div className="p-3 bg-neutral-100 rounded-full w-fit mx-auto mb-3">
                      <Upload className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-[13px] font-medium text-neutral-900 mb-1">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      ou glissez-déposez votre PDF ici
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  {/* File Info */}
                  {uploadState.file && (
                    <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="p-2 bg-neutral-100 rounded-lg">
                        <FileText className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">
                          {uploadState.file.name}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {formatFileSize(uploadState.file.size)}
                        </p>
                      </div>
                      {!uploadState.uploading && !uploadState.processing && !uploadState.success && (
                        <button onClick={resetUpload} className="p-1 rounded-md hover:bg-neutral-100 transition-colors">
                          <X className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Upload Phase */}
                  {uploadState.uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-neutral-400 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Upload en cours...
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900 animate-pulse rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Processing Phase */}
                  {uploadState.processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-neutral-400 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Génération des tiles...
                        </span>
                        <span className="text-neutral-900 font-medium">{uploadState.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>

                      {uploadState.estimatedTime && (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <Clock className="w-3 h-3" />
                          <span>Temps estimé: {uploadState.estimatedTime}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-neutral-500 text-center bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">
                        Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {uploadState.success && (
                    <div className="flex items-start gap-2.5 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-neutral-900 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-medium text-neutral-900">PDF traité avec succès</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Les pages ont été générées et sont maintenant disponibles.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {uploadState.error && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-red-600">Erreur de traitement</p>
                        <p className="text-[11px] text-red-500 mt-0.5">{uploadState.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100">
              <button
                onClick={closeModal}
                disabled={uploadState.uploading || uploadState.processing}
                className="px-4 py-2 text-[13px] font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploadState.success ? 'Fermer' : uploadState.processing ? 'Fermer' : 'Annuler'}
              </button>
              {uploadState.file && !uploadState.success && !uploadState.error && !uploadState.processing && (
                <button
                  onClick={handleUpload}
                  disabled={uploadState.uploading}
                  className="px-4 py-2 text-[13px] font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {uploadState.uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Télécharger
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}