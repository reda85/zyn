'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom, selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'
import { FolderKanban, Users, BarChart3, Settings, Plus, Search, MoreVertical, Archive, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { Outfit } from 'next/font/google'
import clsx from 'clsx'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function ProjectsPage({params}) {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [refresh, setRefresh] = useState(false)
  const { user, profile, organization } = useUserData();
  const menuRef = useRef(null)
  const {organizationId} = params;

  useEffect(() => {
  const fetchProjects = async () => {
    if (!organization?.id || !user?.id || !profile?.id) return;

    // Check if user is admin
    const isAdmin = profile?.role === 'admin';

    let query = supabase
      .from('projects')
      .select('*,plans(*),organizations(*,members(*))')
      .eq('organization_id', organization?.id)
      .is('plans.deleted_at', null)
      .order('created_at', { ascending: false });

    // If not admin, filter by user's assigned projects
    if (!isAdmin) {
      const { data: memberProjects, error } = await supabase
        .from('members_projects')
        .select('project_id')
        .eq('member_id', profile?.id);
        if (error) {
          console.error('Error fetching member projects:', error);
          setProjects([]);
          return;
        }
        if(memberProjects) { console.log('Member Projects:', memberProjects); }
      
      const projectIds = memberProjects?.map(mp => mp.project_id) || [];
      
      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }
      
      query = query.in('id', projectIds);
    }

    const { data } = await query;
    setProjects(data || []);
  };

  fetchProjects();
}, [refresh, organization, user, profile]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync the URL organizationId into the atom whenever it changes
useEffect(() => {
  if (!organizationId || !organization) return;
  if (organization.id === organizationId) return;

  const fetchOrg = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*, members(count)')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return;
    }

    setSelectedOrganization(data);
  };

  fetchOrg();
}, [organizationId]);

  const createProject = async () => {
    
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .rpc('create_project_with_defaults_new', {
        p_name: newProjectName,
        p_organization_id: organizationId
      });

    if (error) {
      alert('Failed to create project.')
      console.error(error)
      setLoading(false)
      return
    }

    setRefresh(!refresh)
    setNewProjectName('')
    setShowModal(false)
    setLoading(false)
  }

  const archiveProject = async (projectId) => {
    const { error } = await supabase
      .from('projects')
      .update({ archived: true })
      .eq('id', projectId)

    if (error) {
      alert('Échec de l\'archivage du projet.')
      return
    }

    setRefresh(!refresh)
    setOpenMenuId(null)
  }

  const deleteProject = async () => {
    if (!projectToDelete) return
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectToDelete.id)

    if (error) {
      alert('Échec de la suppression du projet.')
      console.error(error)
      return
    }

    setRefresh(!refresh)
    setShowDeleteModal(false)
    setProjectToDelete(null)
  }

  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={clsx("flex h-screen bg-gray-50 overflow-hidden", outfit.className)}>
      {/* Side Navigation */}
      <Sidebar organizationId={organizationId} currentPage="projects" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        {/* Header */}
        <div className="flex flex-row items-baseline mb-8 gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 leading-8">Projets</h1>
          <span className="text-xl font-medium text-gray-500">({projects.length})</span>
        </div>

        {/* Search Bar and Create Button */}
        <div className="flex flex-row mb-8 justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="border border-gray-200 bg-white pl-10 pr-4 py-2.5 w-full rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400"
              placeholder="Rechercher un projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Créer un projet
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all hover:shadow-md group relative"
            >
              {/* Menu Button */}
              <div className="absolute top-4 right-4" ref={openMenuId === proj.id ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === proj.id ? null : proj.id)
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400 hover:text-gray-900" />
                </button>
                
                {openMenuId === proj.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        archiveProject(proj.id)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      Archiver
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setProjectToDelete(proj)
                        setShowDeleteModal(true)
                        setOpenMenuId(null)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              <div
                className="cursor-pointer"
                onClick={() => {
                  if (!proj.plans?.length) {
                    alert('Aucun plan trouvé pour ce projet.')
                    return
                  }
                  setSelectedProject(proj)
                  setSelectedPlan(proj.plans[0])
                  router.push(`/${organizationId}/projects/${proj.id}/${proj?.plans[0]?.id}`)
                }}
              >
                <div className="flex items-start justify-between mb-4 pr-8">
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <FolderKanban className="w-6 h-6 text-gray-700" />
                  </div>
                  {proj.plans?.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {proj.plans.length} plan{proj.plans.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors leading-6">
                  {proj.name}
                </h3>
                <p className="text-xs text-gray-500 leading-4">
                  {new Date(proj.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500">Aucun projet trouvé.</p>
          </div>
        )}

        {/* Create Project Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black/30" 
              onClick={() => setShowModal(false)}
            />
            
            <div className="relative bg-white border border-gray-200 rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-4 leading-6">
                Créer un nouveau projet
              </h2>
              
              <p className="text-sm text-gray-500 mb-6 leading-5">
                Organisation: <span className="font-semibold text-gray-900">{selectedOrganization?.name}</span>
              </p>

              <input
                type="text"
                className="border border-gray-200 bg-white p-3 w-full rounded-lg mb-6 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="Nom du projet"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
              />
              
              <div className="flex flex-row justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={loading || !newProjectName.trim()}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="fixed inset-0 bg-black/30" 
              onClick={() => setShowDeleteModal(false)}
            />
            
            <div className="relative bg-white border border-gray-200 rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setProjectToDelete(null)
                }}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-4 leading-6">
                Supprimer le projet
              </h2>
              
              <p className="text-sm text-gray-500 mb-6 leading-5">
                Êtes-vous sûr de vouloir supprimer le projet <span className="font-semibold text-gray-900">"{projectToDelete?.name}"</span> ? Cette action est irréversible.
              </p>
              
              <div className="flex flex-row justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setProjectToDelete(null)
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteProject}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}