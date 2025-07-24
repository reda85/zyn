// components/ProjectPlans.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';


const PdfCanvas = dynamic(() => import('./PdfCanvas'), { ssr: false });

export default function ProjectPlans({ project }) {
  const [plans, setPlans] = useState([])
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()
  const dropRef = useRef(null)

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

  const getPins = async () => {
    const { data } = await supabase
      .from('pins')
      .select('*')
      .eq('project_id', project.id)
    setPins(data || [])
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragActive(false)

    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setName(dropped.name.replace('.pdf', ''))
    } else {
      alert('Only PDF files allowed.')
    }
  }

  const handleUpload = async () => {
    if (!file || !name) return

    const filePath = `${project.id}/${Date.now()}-${file.name}`

    const { data: uploadData, error } = await supabase.storage
      .from('project-plans')
      .upload(filePath, file)

    if (error) {
      console.log(error)
      alert('Upload failed')
      return

    }

    const { data: newPlan } = await supabase
      .from('plans')
      .insert({
        name,
        project_id: project.id,
        file_url: uploadData.path,
      })
      .select()
      .single()

    setPlans((prev) => [...prev, newPlan])
    setFile(null)
    setName('')
  }

  const deletePlan = async (plan) => {
    await supabase.from('plans').delete().eq('id', plan.id)
    await supabase.storage.from('project-plans').remove([plan.file_url])
    setPlans(plans.filter((p) => p.id !== plan.id))
  }

  return (
    <div className="mt-4">
      <div
        ref={dropRef}
        onDrop={handleFileDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        className={`border-2 border-dashed p-6 rounded ${
          dragActive ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
        }`}
      >
        <p className="text-center">
          {file ? `${file.name} selected` : 'Drag & drop a PDF here or click to upload'}
        </p>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          id="upload"
          onChange={(e) => {
            const f = e.target.files[0]
            if (f?.type === 'application/pdf') {
              setFile(f)
              setName(f.name.replace('.pdf', ''))
            }
          }}
        />
        <label htmlFor="upload" className="block text-center text-blue-600 mt-2 underline cursor-pointer">
          Browse PDF
        </label>
      </div>

      <input
        className="mt-4 w-full border p-2"
        placeholder="Plan Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 mt-2 rounded">
        Upload Plan
      </button>

        {plans.map((plan) => (
          <div className='hover:cursor-pointer' onClick={() => router.push(`/projects/${project.id}/${plan.id}`)} key={plan.id}>
          <div  className="bg-gray-100 p-3 flex justify-between items-center rounded">
            <a
              href={supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl}
              target="_blank"
              className="text-blue-600 underline"
              rel="noopener noreferrer"
            >
              {plan.name}
            </a>
            <button
              onClick={() => deletePlan(plan)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>
         
          </div>
        ))}
    
    </div>
  )
}
