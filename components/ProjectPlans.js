'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { Lexend } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, Save, X, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

const API_URL =  'https://zaynbackend-production.up.railway.app'

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
    status: null
  })
  const [dragActive, setDragActive] = useState(false)
  const dropRef = useRef(null)
  const router = useRouter()
  const pollingIntervalRef = useRef(null)
  const realtimeChannelRef = useRef(null)

  // Fetch plans
  useEffect(() => {
    if (!project?.id) return
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', project.id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      if (error) {
        console.error('Error fetching plans:', error)
      } else {
        setPlans(data || [])
      }
    }
    fetchPlans()
  }, [project.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const [editedNames, setEditedNames] = useState({})

  const handleNameChange = (planId, value) => {
    setEditedNames((prev) => ({ ...prev, [planId]: value }))
  }

  const handleFileSelect = (file) => {
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadState({
        file: null,
        uploading: false,
        processing: false,
        progress: 0,
        error: 'Seuls les fichiers PDF sont acceptés',
        success: false,
        planId: null,
        jobId: null,
        estimatedTime: '',
        status: null
      })
      setShowUploadModal(true)
      return
    }

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadState({
        file: null,
        uploading: false,
        processing: false,
        progress: 0,
        error: 'La taille du fichier ne doit pas dépasser 100 MB',
        success: false,
        planId: null,
        jobId: null,
        estimatedTime: '',
        status: null
      })
      setShowUploadModal(true)
      return
    }

    setUploadState({
      file,
      uploading: false,
      processing: false,
      progress: 0,
      error: null,
      success: false,
      planId: null,
      jobId: null,
      estimatedTime: '',
      status: null
    })
    setShowUploadModal(true)
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      handleFileSelect(dropped)
    }
  }

  /**
   * Start Realtime tracking for plan progress
   */
  const startRealtimeTracking = (planId) => {
    // Cleanup previous listener
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }

    // Create Realtime channel
    const channel = supabase
      .channel(`plan:${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plans',
          filter: `id=eq.${planId}`
        },
        (payload) => {
          console.log('📡 Realtime update:', payload.new)

          const { status, processing_progress } = payload.new

          setUploadState(prev => ({
            ...prev,
            progress: processing_progress || 0,
            status
          }))

          if (status === 'ready') {
            setUploadState(prev => ({
              ...prev,
              processing: false,
              success: true
            }))

            // Refresh plans list
            fetchPlansAfterProcessing()

            // Cleanup
            supabase.removeChannel(channel)
          } else if (status === 'failed') {
            setUploadState(prev => ({
              ...prev,
              processing: false,
              error: payload.new.error_message || 'Erreur lors du traitement'
            }))

            supabase.removeChannel(channel)
          }
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel
  }

  /**
   * Fallback: Polling if Realtime fails
   */
  const startPolling = (planId) => {
    // Start polling after 5 seconds (let Realtime try first)
    const timeoutId = setTimeout(() => {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/upload-pdf/status/${planId}`)
          const data = await response.json()

          setUploadState(prev => ({
            ...prev,
            progress: data.processing_progress || 0,
            status: data.status
          }))

          if (data.status === 'ready' || data.status === 'failed') {
            clearInterval(pollingIntervalRef.current)

            if (data.status === 'ready') {
              setUploadState(prev => ({
                ...prev,
                processing: false,
                success: true
              }))
              fetchPlansAfterProcessing()
            } else {
              setUploadState(prev => ({
                ...prev,
                processing: false,
                error: data.error_message || 'Erreur lors du traitement'
              }))
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 3000) // Poll every 3 seconds
    }, 5000)

    return () => {
      clearTimeout(timeoutId)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }

  /**
   * Fetch plans after processing is complete
   */
  const fetchPlansAfterProcessing = async () => {
    const { data: allPlans, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (fetchError) {
      console.error('Error fetching plans:', fetchError)
    } else {
      setPlans(allPlans)
    }
  }

  /**
   * Handle upload with job queue
   */
  const handleUpload = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null
    }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)
      formData.append('projectId', project.id)

      // Upload to backend (returns immediately with job ID)
      const response = await fetch(`${API_URL}/api/upload-pdf`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du téléchargement')
      }

      const result = await response.json()

      console.log('✅ Upload successful:', result)

      // Update state with job info
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        processing: true,
        planId: result.planId,
        jobId: result.jobId,
        estimatedTime: result.estimatedTime,
        status: 'processing',
        progress: 0
      }))

      // Start real-time tracking
      startRealtimeTracking(result.planId)
      startPolling(result.planId)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        processing: false,
        error: error.message,
        progress: 0
      }))
    }
  }

  const resetUpload = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    setUploadState({
      file: null,
      uploading: false,
      processing: false,
      progress: 0,
      error: null,
      success: false,
      planId: null,
      jobId: null,
      estimatedTime: '',
      status: null
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const deletePlan = async (plan) => {
    const { data, error } = await supabase.rpc('soft_delete_plan', { p_plan_id: plan.id })
    if (error) { console.error('Error deleting plan:', error) }
    if (data) { console.log('Plan deleted:', data) }
    await supabase.storage.from('project-plans').remove([plan.file_url])
    setPlans(plans.filter((p) => p.id !== plan.id))
  }

  const handleSaveAndClose = async () => {
    const updates = Object.entries(editedNames)
    for (const [planId, name] of updates) {
      await supabase.from('plans').update({ name }).eq('id', planId)
    }
    setPlans((prev) =>
      prev.map((plan) =>
        editedNames[plan.id] ? { ...plan, name: editedNames[plan.id] } : plan
      )
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
    <div className={`${lexend.className} font-sans bg-background`}>
      <div className="flex h-screen">
        {/* Side Panel */}
        <div className="w-1/4 border-r border-border/40 bg-secondary/20 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-row justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-heading text-foreground">Plans du projet</h2>
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className='text-muted-foreground text-sm mb-6 leading-relaxed'>
              Gérez les plans PDF de votre projet. Le PDF sera automatiquement séparé en pages individuelles.
            </p>
            {/* Enhanced Dropzone */}
            <div
              ref={dropRef}
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col justify-center items-center transition-all ${
                dragActive ? 'bg-primary/10 border-primary scale-[1.02]' : 'border-border/50 hover:border-primary/30 bg-card/50 hover:bg-card'
              }`}
            >
              <div className={`p-4 rounded-full mb-4 transition-all ${
                dragActive ? 'bg-primary/20' : 'bg-secondary/50'
              }`}>
                <Upload className={`w-8 h-8 transition-colors ${
                  dragActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              <p className="text-center mb-2 text-sm font-semibold text-foreground">
                Glissez-déposez un PDF ici
              </p>
              <p className="text-xs text-muted-foreground mb-4">
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
                className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg cursor-pointer hover:bg-primary/20 transition-all"
              >
                Parcourir les fichiers
              </label>
            </div>
          </div>
          {/* Save & Close Button */}
          <button
            onClick={handleSaveAndClose}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center justify-center gap-2 mt-6"
          >
            <Save className="w-5 h-5" />
            Enregistrer et fermer
          </button>
        </div>

        {/* Main Panel: Plans List */}
        <div className="flex-1 overflow-auto bg-background p-6 space-y-6">
          {plans.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-6 bg-secondary/30 rounded-2xl mb-4">
                <FileText className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold font-heading text-foreground mb-2">
                Aucun plan disponible
              </h3>
              <p className="text-muted-foreground max-w-md">
                Commencez par ajouter un plan PDF depuis le panneau de gauche. Il sera automatiquement divisé en pages.
              </p>
            </div>
          )}
          {plans.map((plan) => {
            const publicUrl = supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl
            return (
              <div key={plan.id} className="border border-border/50 bg-card rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all hover:border-border">
                <div className="flex justify-between items-center gap-3">
                  <input
                    className="border border-border/50 bg-secondary/30 rounded-lg px-3 py-2 flex-1 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    value={editedNames[plan.id] ?? plan.name}
                    onChange={(e) => handleNameChange(plan.id, e.target.value)}
                    placeholder="Nom du plan"
                  />
                  {plans.length > 1 && (
                    <button
                      onClick={() => deletePlan(plan)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="border border-border/50 rounded-xl overflow-hidden bg-secondary/20">
                  <Document file={publicUrl}>
                    <Page pageNumber={1} width={800} renderTextLayer={false} renderAnnotationLayer={false} className="mx-auto" />
                  </Document>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upload Modal with Job Queue Support */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold font-heading text-foreground">
                  Importer un fichier PDF
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Le PDF sera automatiquement divisé en pages • Maximum 100 MB
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={uploadState.uploading || uploadState.processing}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {!uploadState.file && !uploadState.error ? (
                // Upload Zone
                <label className="block">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files[0]
                      if (f) {
                        handleFileSelect(f)
                      }
                    }}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200">
                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                      <Upload className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Cliquez pour sélectionner un fichier
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ou glissez-déposez votre PDF ici
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF uniquement, maximum 100 MB
                    </p>
                  </div>
                </label>
              ) : (
                // File Preview & Processing
                <div className="space-y-4">
                  {/* File Info */}
                  {uploadState.file && (
                    <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg border border-border/50">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">
                          {uploadState.file.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(uploadState.file.size)}
                        </p>
                      </div>
                      {!uploadState.uploading && !uploadState.processing && !uploadState.success && (
                        <button
                          onClick={resetUpload}
                          className="p-2 hover:bg-background rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Progress Bar - Upload Phase */}
                  {uploadState.uploading && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Upload en cours...
                        </span>
                        <span className="text-foreground font-semibold">Envoi...</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/80 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Progress Bar - Processing Phase */}
                  {uploadState.processing && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Génération des tiles...
                        </span>
                        <span className="text-foreground font-semibold">{uploadState.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out shadow-lg shadow-primary/20"
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>

                      {/* Estimated Time */}
                      {uploadState.estimatedTime && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Temps estimé: {uploadState.estimatedTime}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground text-center bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        ℹ️ Le traitement continue en arrière-plan. Vous pouvez fermer cette fenêtre.
                      </p>
                    </div>
                  )}

                  {/* Success Message */}
                  {uploadState.success && (
                    <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400">
                          PDF traité avec succès !
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          Les pages ont été générées et sont maintenant disponibles.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadState.error && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-700 dark:text-red-400">
                          Erreur de traitement
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                          {uploadState.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/30">
              <button
                onClick={closeModal}
                disabled={uploadState.uploading || uploadState.processing}
                className="px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadState.success ? 'Fermer' : uploadState.processing ? 'Fermer (continuer en arrière-plan)' : 'Annuler'}
              </button>
              {uploadState.file && !uploadState.success && !uploadState.error && !uploadState.processing && (
                <button
                  onClick={handleUpload}
                  disabled={uploadState.uploading}
                  className="px-6 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {uploadState.uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
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