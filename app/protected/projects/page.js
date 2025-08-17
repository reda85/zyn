// app/projects/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*,plans(*)')
        .order('created_at', { ascending: false })
      setProjects(data || [])
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
    <div className={clsx("flex min-h-screen ", lexend.className)}>
      {/* Side Navigation */}
      <aside className="w-52 bg-neutral-50 text-stone-600 flex flex-col">
      
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/projects" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm hover:border-2 hover:border-blue-200  ">
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link href="/members" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm hover:border-2 hover:border-blue-200   ">
            <Users className="w-5 h-5" /> Members
          </Link>
          <Link href="/reports" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm hover:border-2 hover:border-blue-200   ">
            <BarChart3 className="w-5 h-5" /> Reports
          </Link>
          <Link href="/settings" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm hover:border-2 hover:border-blue-200   ">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex flex-row mb-6 gap-2">
        <h1 className="text-3xl font-bold ">Projects</h1>
        <h1 className="text-2xl text-stone-400 ">({projects.length})</h1>
        </div>

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
              onClick={() => {
                if (!proj.plans?.length) {
                  alert('No plans found for this project.')
                  return
                }
                setSelectedProject(proj)
                setSelectedPlan(proj.plans[0])
                router.push(`/protected/projects/${proj.id}/${proj?.plans[0]?.id}`)
              }}
            >
              {proj.name}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
