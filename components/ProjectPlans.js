'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import { Lexend } from 'next/font/google'
import { useRouter } from 'next/navigation'

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
      // Auto-upload after dropping
      await handleUpload(dropped)
    } else {
      alert('Only PDF files allowed.')
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
      alert('Upload failed')
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

    // Update local state
    setPlans((prev) =>
      prev.map((plan) => editedNames[plan.id] ? { ...plan, name: editedNames[plan.id] } : plan)
    )
    setEditedNames({})
    router.back() // Navigate back after saving
  }

  return (
    <div className={lexend.className}>
      <div className="flex h-screen">
        {/* Side Panel */}
        <div className="w-1/4 border-r p-4 flex flex-col justify-between">
          <div className="flex flex-row justify-between items-baseline">
            <h2 className="text-xl font-semibold mb-4">Project Plans</h2>
            <button
              onClick={() => router.back()}
              className="bg-gray-200 px-3 py-2 rounded self-start"
            >
              Cancel
            </button>
          </div>
          <p className='text-stone-400 text-xs mt-4'>
            Vous pouvez ici gerer les plans PDF de votre projet, soit en mettant a jour vos plans existants ou en ajoutant de nouveaux plans
          </p>

          {/* Dropzone */}
          <div
            ref={dropRef}
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            className={`border-2 mt-4 border-dashed p-6 rounded flex-1 flex flex-col justify-center items-center ${dragActive ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
          >
            <p className="text-center mb-2">
              {file ? `${file.name} selected` : 'Drag & drop a PDF here or click to upload'}
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
            <label htmlFor="upload" className="block text-blue-600 underline cursor-pointer">
              Browse PDF
            </label>
          </div>

          {/* Save & Close Button */}
          <button
            onClick={handleSaveAndClose}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
          >
            Save and Close
          </button>
        </div>

        {/* Main Panel: Plans List */}
        <div className="flex-1 overflow-auto bg-neutral-100 p-4 space-y-6">
          {plans.map((plan) => {
            const publicUrl = supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl
            return (
              <div key={plan.id} className="border bg-white p-3 rounded space-y-2">
                <div className="flex justify-between items-center">
                  <input
                    className="border p-1 flex-1 mr-2"
                    value={editedNames[plan.id] ?? plan.name}
                    onChange={(e) => handleNameChange(plan.id, e.target.value)}
                  />
                  <button
                    onClick={() => deletePlan(plan)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>

                <div className="border rounded overflow-auto" >
                  <Document file={publicUrl}>
                    <Page pageNumber={1} fitPolicy={0} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
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
