'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedOrganizationAtom, selectedPlanAtom, selectedProjectAtom } from '@/store/atoms'
import { Plus, Search, MoreVertical, Archive, Trash2, X, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'

import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'

function ProjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white border border-[#e5e5e2] rounded-[4px] p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#eeeeec] animate-pulse flex-shrink-0" />
            <div className="h-3.5 rounded-[2px] bg-[#eeeeec] animate-pulse flex-1" style={{ maxWidth: `${100 + (i % 3) * 20}px` }} />
          </div>
          <div className="h-3 w-16 rounded-[2px] bg-[#eeeeec] animate-pulse mb-3" />
          <div className="h-2.5 w-20 rounded-[2px] bg-[#eeeeec] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function ProjectsPage({ params }) {
  const { organizationId } = params
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
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
  const [viewMode, setViewMode] = useState('grid')
  const router = useRouter()
  const [refresh, setRefresh] = useState(false)

  const menuRef = useRef(null)
  const fetchedKeyRef = useRef(null)

  const { user, profile, organization, isAdmin } = useUserData(organizationId)

  useEffect(() => {
    if (!organization?.id || !user?.id || !profile?.id) return

    const key = `${organization.id}:${user.id}:${profile.id}:${isAdmin}:${refresh}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key

    const fetchProjects = async () => {
      setProjectsLoading(true)
      try {
        let query = supabase
          .from('projects')
          .select('*,organization_id,plans!inner(*),members_projects(*,members(*))')
          .eq('organization_id', organization.id)
          .is('plans.deleted_at', null)
          .order('created_at', { ascending: false })

        if (!isAdmin) {
          const { data: memberProjects, error } = await supabase
            .from('members_projects')
            .select('project_id')
            .eq('member_id', profile.id)
          if (error) {
            console.error('Error fetching member projects:', error)
            setProjects([])
            return
          }

          const projectIds = memberProjects?.map((mp) => mp.project_id) || []

          if (projectIds.length === 0) {
            setProjects([])
            return
          }

          query = query.in('id', projectIds)
        }

        const { data, error } = await query
        if (error) console.error('Error fetching projects:', error)
        setProjects(data || [])
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchProjects()
  }, [refresh, organization?.id, user?.id, profile?.id, isAdmin])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!organizationId) return
    if (organization?.id === organizationId) return

    const fetchOrg = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, members(count)')
        .eq('id', organizationId)
        .single()

      if (error) {
        console.error('Error fetching organization:', error)
        return
      }

      setSelectedOrganization(data)
    }

    fetchOrg()
  }, [organizationId, organization?.id])

  const createProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    const { data, error } = await supabase.rpc('create_project_with_defaults', {
      p_name: newProjectName,
      p_organization_id: organizationId,
    })

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
      alert("Échec de l'archivage du projet.")
      return
    }

    setRefresh(!refresh)
    setOpenMenuId(null)
  }

  const deleteProject = async () => {
    if (!projectToDelete) return

    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id)

    if (error) {
      alert('Échec de la suppression du projet.')
      console.error(error)
      return
    }

    setRefresh(!refresh)
    setShowDeleteModal(false)
    setProjectToDelete(null)
  }

  const handleProjectClick = (proj) => {
    if (!proj.plans?.length) {
      alert('Aucun plan trouvé pour ce projet.')
      return
    }
    setSelectedProject(proj)
    setSelectedPlan(proj.plans[0])
    router.push(`/${organizationId}/projects/${proj.id}/${proj?.plans[0]?.id}`)
  }

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `il y a ${diffDays} jours`
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`
    if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`
    return `il y a ${Math.floor(diffDays / 365)} an(s)`
  }

  const filteredProjects = projects.filter((proj) =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={clsx('flex h-screen bg-[#fafaf9] overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="projects" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium tracking-[-0.003em] text-[#050505]">Projets</h1>
            {projectsLoading ? (
              <div className="h-3 w-32 rounded-[2px] bg-[#eeeeec] animate-pulse mt-1.5" />
            ) : (
              <p className={clsx('text-[12px] text-[#8a8a84] mt-0.5', GeistMono.className)}>
                {projects.length} projet
                {projects.length !== 1 ? 's' : ''} au total
              </p>
            )}
          </div>
          {profile?.role !== 'guest' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#0d0d0c] text-white px-4 py-2 rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Créer un projet
            </button>
          )}
        </div>

        {/* ── Search + View Toggle ── */}
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a84]" />
            <input
              type="text"
              className="border border-[#e5e5e2] bg-white pl-8 pr-3 py-[7px] w-full rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
              placeholder="Rechercher un projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-[#eeeeec] rounded-[4px] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-[6px] rounded-[3px] transition-all',
                viewMode === 'grid'
                  ? 'bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] text-[#050505]'
                  : 'text-[#8a8a84] hover:text-[#4a4a46]'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-[6px] rounded-[3px] transition-all',
                viewMode === 'list'
                  ? 'bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] text-[#050505]'
                  : 'text-[#8a8a84] hover:text-[#4a4a46]'
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {projectsLoading ? (
          <ProjectsGridSkeleton />
        ) : (
          <>
            {/* ── Grid View ── */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-white border border-[#e5e5e2] rounded-[4px] p-4 hover:border-[#d6d6d2] hover:shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] transition-all group relative cursor-pointer"
                    onClick={() => handleProjectClick(proj)}
                  >
                    {/* Menu */}
                    {profile?.role !== 'guest' && (
                      <div
                        className="absolute top-3 right-3"
                        ref={openMenuId === proj.id ? menuRef : null}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === proj.id ? null : proj.id)
                          }}
                          className="p-1.5 rounded-[3px] hover:bg-[#eeeeec] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4 text-[#8a8a84]" />
                        </button>

                        {openMenuId === proj.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-[#e5e5e2] rounded-[4px] shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] overflow-hidden z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                archiveProject(proj.id)
                              }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-[#4a4a46] hover:bg-[#f5f5f4] transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archiver
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setProjectToDelete(proj)
                                setShowDeleteModal(true)
                                setOpenMenuId(null)
                              }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-[#9c1b1b] hover:bg-[#fde8e8] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card content */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-[4px] bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-sm font-medium text-[#050505] flex-shrink-0">
                        {proj.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <h3 className="text-[14px] font-medium text-[#0d0d0c] truncate flex-1 pr-6">
                        {proj.name}
                      </h3>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-3">
                      {proj.plans?.length > 0 && (
                        <span className={clsx('text-[12px] text-[#666660] flex items-center gap-1', GeistMono.className)}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 3v18" />
                          </svg>
                          {proj.plans.length} plan{proj.plans.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Footer: date */}
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-[11px] text-[#b8b8b3]', GeistMono.className)}>
                        {getRelativeTime(proj.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── List View ── */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-[4px] border border-[#e5e5e2] overflow-hidden">
                <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '5%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#f5f5f4]">
                      {['Projet', 'Plans', 'Créé le', 'Activité', ''].map((h) => (
                        <th
                          key={h}
                          className={clsx(
                            'px-4 py-2 text-[11px] font-medium text-[#666660] uppercase tracking-[0.08em] text-left border-b border-[#e5e5e2]',
                            GeistMono.className
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((proj) => (
                      <tr
                        key={proj.id}
                        className="border-b border-[#eeeeec] hover:bg-[#f5f5f4] cursor-pointer transition-colors group"
                        onClick={() => handleProjectClick(proj)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-[3px] bg-[#eeeeec] border border-[#e5e5e2] flex items-center justify-center text-xs font-medium text-[#050505] flex-shrink-0">
                              {proj.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-[13px] font-medium text-[#0d0d0c] truncate">
                              {proj.name}
                            </span>
                          </div>
                        </td>
                        <td className={clsx('px-4 py-3 text-[13px] text-[#666660]', GeistMono.className)}>
                          {proj.plans?.length || 0}
                        </td>
                        <td className={clsx('px-4 py-3 text-[13px] text-[#666660]', GeistMono.className)}>
                          {new Date(proj.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className={clsx('px-4 py-3 text-[12px] text-[#8a8a84]', GeistMono.className)}>
                          {getRelativeTime(proj.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {profile?.role !== 'guest' && (
                            <div ref={openMenuId === proj.id ? menuRef : null} className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuId(openMenuId === proj.id ? null : proj.id)
                                }}
                                className="p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-4 h-4 text-[#8a8a84]" />
                              </button>

                              {openMenuId === proj.id && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-[#e5e5e2] rounded-[4px] shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] overflow-hidden z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      archiveProject(proj.id)
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-[#4a4a46] hover:bg-[#f5f5f4] transition-colors"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archiver
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setProjectToDelete(proj)
                                      setShowDeleteModal(true)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-[#9c1b1b] hover:bg-[#fde8e8] transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[13px] text-[#8a8a84]">Aucun projet trouvé.</p>
              </div>
            )}
          </>
        )}

        {/* ── Create Modal ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/20" onClick={() => setShowModal(false)} />

            <div className="relative bg-white border border-[#e5e5e2] rounded-[6px] p-6 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-md w-full mx-4">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors"
              >
                <X className="w-4 h-4 text-[#8a8a84]" />
              </button>

              <h2 className="text-base font-medium text-[#050505] mb-1">
                Créer un nouveau projet
              </h2>
              <p className="text-[13px] text-[#8a8a84] mb-5">
                Organisation:{' '}
                <span className="font-medium text-[#0d0d0c]">{selectedOrganization?.name}</span>
              </p>

              <input
                type="text"
                className="border border-[#e5e5e2] bg-white px-3 py-2.5 w-full rounded-[4px] text-[13px] mb-5 focus:outline-none focus:border-[#0d0d0c] transition-colors text-[#0d0d0c] placeholder:text-[#b8b8b3]"
                placeholder="Nom du projet"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-[#0d0d0c] rounded-[4px] hover:bg-[#1a1a18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Modal ── */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/20" onClick={() => setShowDeleteModal(false)} />

            <div className="relative bg-white border border-[#e5e5e2] rounded-[6px] p-6 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-md w-full mx-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setProjectToDelete(null)
                }}
                className="absolute top-4 right-4 p-1 rounded-[3px] hover:bg-[#eeeeec] transition-colors"
              >
                <X className="w-4 h-4 text-[#8a8a84]" />
              </button>

              <h2 className="text-base font-medium text-[#050505] mb-1">
                Supprimer le projet
              </h2>
              <p className="text-[13px] text-[#666660] mb-5">
                Êtes-vous sûr de vouloir supprimer{' '}
                <span className="font-medium text-[#0d0d0c]">"{projectToDelete?.name}"</span> ?
                Cette action est irréversible.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setProjectToDelete(null)
                  }}
                  className="px-4 py-2 text-[13px] font-medium text-[#4a4a46] bg-[#eeeeec] rounded-[4px] hover:bg-[#d6d6d2] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteProject}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-[#dc2626] rounded-[4px] hover:bg-[#b91c1c] transition-colors"
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