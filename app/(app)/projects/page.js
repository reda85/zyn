// app/projects/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom, selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'
import { Dialog } from '@headlessui/react'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
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
    }
    fetchProjects()
  }, [refresh])

  const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .rpc('create_project_with_defaults', {
        p_name: newProjectName,
        p_organization_id: selectedOrganization?.id || selectedProject?.organization_id || projects[0]?.organization_id
      });

    if (error) {
      alert('Failed to create project.')
      setLoading(false)
      return
    }

    setProjects((prev) => [data, ...prev])
    setRefresh(!refresh)
    setNewProjectName('')
    setShowModal(false)
    setLoading(false)
  }

  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={clsx("flex min-h-screen bg-background font-sans", lexend.className)}>
      {/* Side Navigation */}
      <aside className="w-64 bg-secondary/20 border-r border-border/40 flex flex-col">
        {/* Organization Card */}
        <div className="px-4 py-5 flex-col border border-border/50 bg-card/80 backdrop-blur-sm flex mx-4 my-6 rounded-xl gap-2 shadow-sm">
          <h2 className="text-sm font-semibold font-heading text-foreground">{selectedOrganization?.name}</h2>
          <p className="text-xs text-muted-foreground">{selectedOrganization?.members?.length} membres</p>
        </div>
      
        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/projects" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-xl shadow-sm border border-primary/20"
          >
            <FolderKanban className="w-5 h-5" /> Projects
          </Link>
          <Link 
            href="/members" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Users className="w-5 h-5" /> Membres
          </Link>
          <Link 
            href="/reports" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <BarChart3 className="w-5 h-5" /> Rapports
          </Link>
          <Link 
            href="/settings" 
            className="flex text-sm font-medium items-center gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 hover:text-primary rounded-xl transition-all border border-transparent hover:border-border/50"
          >
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        {/* Header */}
        <div className="flex flex-row items-baseline mb-8 mt-12 gap-3">
          <h1 className="text-4xl font-bold font-heading text-foreground">Projets</h1>
          <span className="text-2xl font-semibold text-muted-foreground">({projects.length})</span>
        </div>

        {/* Search Bar and Create Button */}
        <div className="flex flex-row mb-8 justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              className="border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
              placeholder="Rechercher un projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Créer un projet
          </button>
        </div>

        {/* Projects List */}
        <div className="space-y-3">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-6 bg-secondary/30 border border-border/50 rounded-xl hover:border-primary/20 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
              onClick={() => {
                if (!proj.plans?.length) {
                  alert('Aucun plan trouvé pour ce projet.')
                  return
                }
                setSelectedProject(proj)
                setSelectedPlan(proj.plans[0])
                router.push(`/projects/${proj.id}/${proj?.plans[0]?.id}`)
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
                {proj.plans?.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                    {proj.plans.length} plan{proj.plans.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold font-heading text-foreground mb-2 group-hover:text-primary transition-colors">
                {proj.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {new Date(proj.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Aucun projet trouvé.</p>
          </div>
        )}

        {/* Create Project Modal */}
        {showModal && (
          <Dialog 
            open={showModal} 
            onClose={() => setShowModal(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-card border border-border/50 rounded-2xl p-6 shadow-2xl max-w-md w-full backdrop-blur-sm">
                <Dialog.Title className="text-2xl font-bold font-heading text-foreground mb-4">
                  Créer un nouveau projet
                </Dialog.Title>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Organisation: <span className="font-semibold text-foreground">{selectedOrganization?.name}</span>
                </p>

                <input
                  type="text"
                  className="border border-border/50 bg-secondary/30 p-3 w-full rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
                  placeholder="Nom du projet"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
                
                <div className="flex flex-row justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-full font-medium hover:bg-secondary/80 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createProject}
                    disabled={loading || !newProjectName.trim()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </main>
    </div>
  )
}