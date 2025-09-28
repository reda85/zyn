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
import { Dialog } from '@headlessui/react'



const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*,plans(*),organizations(*,members(*))')
        .order('created_at', { ascending: false })
      setProjects(data || [])
      console.log('Fetched projects:', data)
    }
    fetchProjects()
  }, [refresh])

  {/*const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newProjectName, organization_id: selectedProject?.organization_id || projects[0]?.organization_id })
      .select()
      .single()

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    if(data) {
      console.log('Created project:', data)
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .insert({ name: 'Sample Floor Plan (PDF)', project_id: data.id , file_url : '1/1748379744388-Sample Floor Plan (PDF).pdf'})
        .select('*')
        
        if (planError) {
          alert('Failed to create plan.')
          setLoading(false)
          return
        }
        console.log('Created plan:', planData)
      setSelectedPlan(planData)
      setRefresh(!refresh)
    }
    setNewProjectName('')
    setLoading(false)
  }
*/}

const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .rpc('create_project_with_defaults', {
    p_name: newProjectName,
    p_organization_id: selectedProject?.organization_id || projects[0]?.organization_id
  });
      
      

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    setRefresh(!refresh)
     setNewProjectName('')
    setLoading(false)
  }
  return (
    <div className={clsx("flex min-h-screen ", lexend.className)}>
      {/* Side Navigation */}
      <aside className="w-52 bg-neutral-50 text-stone-600 flex flex-col">
        <div className="px-4 py-5 flex-col border-2 border-blue-50 bg-white flex  mx-4 my-6 rounded-md gap-2 shadow-sm">
          <h2 className="text-sm  text-stone-800">{projects[0]?.organizations?.name}</h2>
          <p className="text-xs  text-stone-500">{projects[0]?.organizations?.members?.length} members</p>
          </div>
      
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/protected/projects" className="flex text-sm items-center gap-3 px-4 py-2 bg-blue-100 text-stone-800 rounded-lg shadow-sm border-blue-300  ">
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link href="/protected/members" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <Users className="w-5 h-5" /> Members
          </Link>
          <Link href="/reports" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <BarChart3 className="w-5 h-5" /> Reports
          </Link>
          <Link href="/settings" className="flex text-sm items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-stone-800 hover:rounded-lg hover:shadow-sm border-2 border-neutral-50 hover:border-blue-200   ">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="flex flex-row mb-6 mt-12 gap-2">
        <h1 className="text-3xl font-bold ">Projects</h1>
        <h1 className="text-2xl text-stone-400 ">({projects.length})</h1>
        </div>

        <div className="flex flex-row mb-6 justify-between space-y-2">
          <input
            type="text"
            className="border p-2 w-64 rounded-md"
            placeholder="chercher un projet"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button
            onClick={(e) => {setShowModal(true)}}
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
        {showModal && <Dialog open={showModal} onClose={() => setShowModal(false)}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <h1 className="text-2xl font-bold">
                {selectedProject?.organizations?.name}
              </h1>
             

                <input
            type="text"
            className="border p-2 w-64 rounded-md"
            placeholder="créer un projet"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
              <div className="flex flex-row justify-between">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
                <button
                  onClick={createProject}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Create Plan
                </button>
              </div>
            </div>
          </Dialog>}
      </main>
    </div>
  )
}
