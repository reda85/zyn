'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { Lexend } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, Save, X } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectPlans({ project, onClose }) {
  const [plans, setPlans] = useState([])
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const dropRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    if (!project?.id) return

    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', project.id)
      setPlans(data || [])
    }

    fetchPlans()
  }, [project.id])

  // Local state to track edited names
  const [editedNames, setEditedNames] = useState({})

  // Update local edited name
  const handleNameChange = (planId, value) => {
    setEditedNames((prev) => ({ ...prev, [planId]: value }))
  }

  const handleFileDrop = async (e) => {
    e.preventDefault()
    setDragActive(false)

    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      await handleUpload(dropped)
    } else {
      alert('Seuls les fichiers PDF sont autorisés.')
    }
  }

  const handleUpload = async (pdfFile = file) => {
    if (!pdfFile) return

    const filePath = `${project.id}/${Date.now()}-${pdfFile.name}`

    const { data: uploadData, error } = await supabase.storage
      .from('project-plans')
      .upload(filePath, pdfFile)

    if (error) {
      console.log(error)
      alert('Échec du téléchargement')
      return
    }

    const planName = pdfFile.name.replace('.pdf', '')

    const { data: newPlan } = await supabase
      .from('plans')
      .insert({
        name: planName,
        project_id: project.id,
        file_url: uploadData.path,
      })
      .select()
      .single()

    setPlans((prev) => [...prev, newPlan])
    setFile(null)
  }

  const deletePlan = async (plan) => {
    await supabase.from('plans').delete().eq('id', plan.id)
    await supabase.storage.from('project-plans').remove([plan.file_url])
    setPlans(plans.filter((p) => p.id !== plan.id))
  }

  // Save all edited names
  const handleSaveAndClose = async () => {
    const updates = Object.entries(editedNames)
    for (const [planId, name] of updates) {
      await supabase.from('plans').update({ name }).eq('id', planId)
    }

    setPlans((prev) =>
      prev.map((plan) => editedNames[plan.id] ? { ...plan, name: editedNames[plan.id] } : plan)
    )
    setEditedNames({})
    router.back()
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
              Gérez les plans PDF de votre projet : mettez à jour vos plans existants ou ajoutez de nouveaux plans.
            </p>

            {/* Dropzone */}
            <div
              ref={dropRef}
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col justify-center items-center transition-all ${
                dragActive 
                  ? 'bg-primary/10 border-primary' 
                  : 'border-border/50 hover:border-primary/30 bg-card/50'
              }`}
            >
              <Upload className={`w-12 h-12 mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-center mb-3 text-sm font-medium text-foreground">
                {file ? `${file.name} sélectionné` : 'Glissez-déposez un PDF ici'}
              </p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="upload"
                onChange={async (e) => {
                  const f = e.target.files[0]
                  if (f?.type === 'application/pdf') {
                    setFile(f)
                    await handleUpload(f)
                  }
                }}
              />
              <label 
                htmlFor="upload" 
                className="text-sm text-primary font-medium cursor-pointer hover:underline"
              >
                ou parcourir les fichiers
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
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold font-heading text-foreground mb-2">
                Aucun plan disponible
              </h3>
              <p className="text-muted-foreground">
                Commencez par ajouter un plan PDF depuis le panneau de gauche
              </p>
            </div>
          )}

          {plans.map((plan) => {
            const publicUrl = supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl
            return (
              <div key={plan.id} className="border border-border/50 bg-card rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center gap-3">
                  <input
                    className="border border-border/50 bg-secondary/30 rounded-lg px-3 py-2 flex-1 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    value={editedNames[plan.id] ?? plan.name}
                    onChange={(e) => handleNameChange(plan.id, e.target.value)}
                    placeholder="Nom du plan"
                  />
                  <button
                    onClick={() => deletePlan(plan)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="border border-border/50 rounded-xl overflow-hidden bg-secondary/20">
                  <Document file={publicUrl}>
                    <Page 
                      pageNumber={1} 
                      width={800} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                      className="mx-auto"
                    />
                  </Document>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}