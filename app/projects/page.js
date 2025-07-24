// app/projects/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'


export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('*,plans(*)').order('created_at', { ascending: false })
      setProjects(data || [])
      console.log('projects', data)
    }
    fetchProjects()
  }, [])

  const createProject = async () => {
    if (!newProjectName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newProjectName })
      .select()
      .single()

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    setNewProjectName('')
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projects</h1>

      <div className="mb-6 space-y-2">
        <input
          type="text"
          className="border p-2 w-full"
          placeholder="New Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button
          onClick={createProject}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </div>

      <ul className="space-y-3">
        {projects.map((proj) => (
          <li
            key={proj.id}
            className="p-4 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
            onClick={() => {setSelectedProject(proj); setSelectedPlan(proj.plans[0]); router.push(`/projects/${proj.id}/${proj.plans[0].id}`)}}
          >
            {proj.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
