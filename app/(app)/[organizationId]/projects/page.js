'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase/client'
import { qk } from '@/lib/data/keys'
import { Plus, Search, MoreVertical, Archive, Trash2, X, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'

import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { useUserData } from '@/hooks/useUserData'
import Sidebar from '@/components/Sidebar'
import { fetchOverview } from '@/lib/data/overview'
import { Bandeau, StatusBar, percentClosed } from './Overview'

function ProjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white border border-filet rounded-[6px] p-4 min-h-[148px] flex flex-col">
          <div className="h-3.5 rounded-[3px] bg-voile animate-pulse" style={{ maxWidth: `${140 + (i % 3) * 30}px` }} />
          <div className="h-3 w-24 rounded-[3px] bg-voile animate-pulse mt-2" />
          <div className="h-1.5 rounded-full bg-voile animate-pulse mt-auto mb-4" />
          <div className="h-3 w-32 rounded-[3px] bg-voile animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function ProjectsPage({ params }) {
  const { organizationId } = params
  const [newProjectName, setNewProjectName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const router = useRouter()
  const queryClient = useQueryClient()

  const menuRef = useRef(null)

  const { profile, organization: selectedOrganization, isAdmin } = useUserData(organizationId)

  // Les non-administrateurs ne voient que les projets auxquels ils sont rattachés.
  const scope = useMemo(
    () => ({ memberId: profile?.id ?? null, isAdmin }),
    [profile?.id, isAdmin]
  )

  const { data: projects = [], isPending: projectsLoading } = useQuery({
    queryKey: qk.projects(organizationId, scope),
    enabled: Boolean(organizationId && scope.memberId),
    queryFn: async () => {
      // Colonnes de la carte uniquement ; jointure externe sur les plans pour
      // qu'un projet sans plan reste visible.
      let query = supabase
        .from('projects')
        .select('id,name,address,created_at,organization_id,plans(id,created_at)')
        .eq('organization_id', organizationId)
        .is('plans.deleted_at', null)
        .order('created_at', { ascending: false })
        .order('created_at', { referencedTable: 'plans', ascending: true })

      if (!scope.isAdmin) {
        const { data: memberProjects, error } = await supabase
          .from('members_projects')
          .select('project_id')
          .eq('member_id', scope.memberId)
        if (error) throw error
        const projectIds = (memberProjects ?? []).map((mp) => mp.project_id)
        if (projectIds.length === 0) return []
        query = query.in('id', projectIds)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects])
  const isGuest = profile?.role === 'guest'
  const { data: overview, isPending: overviewLoading } = useQuery({
    queryKey: qk.overview(organizationId, projectIds),
    enabled: !projectsLoading && !isGuest,
    queryFn: () => fetchOverview(projectIds),
    staleTime: 60_000,
  })
  const statsFor = (id) => overview?.byProject?.[id]

  const refreshProjects = () => queryClient.invalidateQueries({ queryKey: ['projects', organizationId] })

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

    refreshProjects()
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

    refreshProjects()
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

    refreshProjects()
    setShowDeleteModal(false)
    setProjectToDelete(null)
  }

  const handleProjectClick = (proj) => {
    // Sans plan, on ouvre la gestion des plans pour en importer un.
    const firstPlan = proj.plans?.[0]
    router.push(
      firstPlan
        ? `/${organizationId}/projects/${proj.id}/${firstPlan.id}`
        : `/${organizationId}/projects/${proj.id}/sources`
    )
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

  const menu = (proj) =>
    profile?.role !== 'guest' && (
      <div className="relative" ref={openMenuId === proj.id ? menuRef : null}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpenMenuId(openMenuId === proj.id ? null : proj.id)
          }}
          aria-label={`Actions pour ${proj.name}`}
          className={clsx(
            'p-1 rounded-[4px] text-mine-clair hover:bg-voile hover:text-encre transition-colors',
            openMenuId === proj.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {openMenuId === proj.id && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-filet rounded-[6px] shadow-[0_8px_24px_-8px_rgba(28,28,26,0.18)] py-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                archiveProject(proj.id)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-mine hover:bg-survol hover:text-encre transition-colors"
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
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-alerte hover:bg-alerte-pale transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    )

  // Ligne de chiffres sous la barre de statuts : seuls les nombres utiles apparaissent.
  const figures = (proj) => {
    const st = statsFor(proj.id)
    const plans = proj.plans?.length ?? 0
    return (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] text-mine tabular-nums">
        {st && <span><span className="text-encre font-medium">{st.open}</span> ouverte{st.open > 1 ? 's' : ''}</span>}
        {st?.overdue > 0 && <span className="text-alerte"><span className="font-medium">{st.overdue}</span> en retard</span>}
        <span>{plans ? `${plans} plan${plans > 1 ? 's' : ''}` : 'Aucun plan'}</span>
      </div>
    )
  }

  const lastActivity = (proj) => {
    const t = statsFor(proj.id)?.lastActivity
    return t ? getRelativeTime(new Date(t).toISOString()) : getRelativeTime(proj.created_at)
  }

  return (
    <div className={clsx('flex h-screen bg-papier overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="projects" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1240px] mx-auto px-8 pt-8 pb-12">
          {/* ── En-tête ── */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre leading-tight">Projets</h1>
              <p className="text-[13px] text-mine mt-1 truncate">
                {selectedOrganization?.name}
                {!projectsLoading && (
                  <span className="text-mine-clair tabular-nums">
                    {', '}{projects.length} projet{projects.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            {profile?.role !== 'guest' && (
              <button
                onClick={() => setShowModal(true)}
                className="shrink-0 bg-encre text-white h-9 px-3.5 rounded-[4px] text-[13px] font-medium hover:bg-encre-survol transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Créer un projet
              </button>
            )}
          </div>

          {!isGuest && (projectsLoading || projects.length > 0) && (
            <Bandeau overview={overview} loading={projectsLoading || overviewLoading} />
          )}

          {/* ── Recherche + affichage ── */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mine-clair" />
              <input
                type="search"
                aria-label="Rechercher un projet"
                className="border border-filet bg-white pl-8 pr-3 h-9 w-full rounded-[4px] text-[13px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                placeholder="Rechercher un projet"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex border border-filet bg-white rounded-[4px] p-0.5" role="group" aria-label="Affichage">
              {[['grid', LayoutGrid, 'Grille'], ['list', List, 'Liste']].map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  title={label}
                  className={clsx(
                    'h-7 w-7 flex items-center justify-center rounded-[3px] transition-colors',
                    viewMode === mode ? 'bg-voile text-encre' : 'text-mine-clair hover:text-encre'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {projectsLoading ? (
            <ProjectsGridSkeleton />
          ) : (
            <>
              {/* ── Grille ── */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredProjects.map((proj) => {
                    const pct = percentClosed(statsFor(proj.id))
                    return (
                      <div
                        key={proj.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => handleProjectClick(proj)}
                        onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(proj)}
                        className="group bg-white border border-filet rounded-[6px] p-4 hover:border-filet-fort transition-colors cursor-pointer flex flex-col gap-4 min-h-[148px]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[14px] font-semibold text-encre truncate">{proj.name}</h3>
                            <p className="text-[12px] text-mine-clair truncate mt-0.5">
                              {proj.address || 'Adresse non renseignée'}
                            </p>
                          </div>
                          {menu(proj)}
                        </div>

                        {!isGuest && (
                          <div className="mt-auto">
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-[12px] text-mine">Levées</span>
                              <span className="text-[12px] text-encre font-medium tabular-nums">
                                {pct === null ? '—' : `${pct} %`}
                              </span>
                            </div>
                            <StatusBar stats={statsFor(proj.id)} />
                          </div>
                        )}

                        <div className={clsx('flex items-end justify-between gap-3', isGuest && 'mt-auto')}>
                          {figures(proj)}
                          <span className="text-[11px] text-mine-clair whitespace-nowrap">{lastActivity(proj)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Liste ── */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-[6px] border border-filet overflow-x-auto">
                  <table className="w-full min-w-[760px]" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '4%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {['Projet', 'Levées', 'Ouvertes', 'En retard', 'Plans', 'Activité', ''].map((h, i) => (
                          <th
                            key={i}
                            className={clsx(
                              'px-4 py-2.5 text-[12px] font-medium text-mine border-b border-filet',
                              i >= 2 && i <= 4 ? 'text-right' : 'text-left'
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((proj) => {
                        const st = statsFor(proj.id)
                        const pct = percentClosed(st)
                        return (
                          <tr
                            key={proj.id}
                            className="border-b border-voile last:border-0 hover:bg-survol cursor-pointer transition-colors group"
                            onClick={() => handleProjectClick(proj)}
                          >
                            <td className="px-4 py-3">
                              <p className="text-[13px] font-medium text-encre truncate">{proj.name}</p>
                              <p className="text-[12px] text-mine-clair truncate">{proj.address || '—'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <StatusBar stats={st} className="flex-1" />
                                <span className="w-10 text-right text-[12px] text-encre tabular-nums">{pct === null ? '—' : `${pct} %`}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] text-encre tabular-nums">{st?.open ?? '—'}</td>
                            <td className={clsx('px-4 py-3 text-right text-[13px] tabular-nums', st?.overdue ? 'text-alerte font-medium' : 'text-mine-clair')}>
                              {st ? st.overdue : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] text-mine tabular-nums">{proj.plans?.length || 0}</td>
                            <td className="px-4 py-3 text-[12px] text-mine-clair">{lastActivity(proj)}</td>
                            <td className="px-2 py-3">{menu(proj)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredProjects.length === 0 && (
                <div className="text-center py-16 border border-dashed border-filet-fort rounded-[6px]">
                  <p className="text-[13px] text-mine">
                    {searchQuery ? `Aucun projet ne correspond à « ${searchQuery} ».` : 'Aucun projet pour le moment.'}
                  </p>
                  {!searchQuery && profile?.role !== 'guest' && (
                    <button onClick={() => setShowModal(true)} className="mt-3 text-[13px] font-medium text-tirage hover:text-tirage-fonce">
                      Créer le premier projet
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Create Modal ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/20" onClick={() => setShowModal(false)} />

            <div className="relative bg-white border border-filet rounded-[6px] p-6 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-md w-full mx-4">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 rounded-[3px] hover:bg-voile transition-colors"
              >
                <X className="w-4 h-4 text-mine-clair" />
              </button>

              <h2 className="text-base font-medium text-encre mb-1">
                Créer un nouveau projet
              </h2>
              <p className="text-[13px] text-mine-clair mb-5">
                Organisation:{' '}
                <span className="font-medium text-encre">{selectedOrganization?.name}</span>
              </p>

              <input
                type="text"
                className="border border-filet bg-white px-3 py-2.5 w-full rounded-[4px] text-[13px] mb-5 focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
                placeholder="Nom du projet"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[13px] font-medium text-encre bg-white border border-filet rounded-[4px] hover:bg-survol transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-encre rounded-[4px] hover:bg-encre-survol transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

            <div className="relative bg-white border border-filet rounded-[6px] p-6 shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] max-w-md w-full mx-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setProjectToDelete(null)
                }}
                className="absolute top-4 right-4 p-1 rounded-[3px] hover:bg-voile transition-colors"
              >
                <X className="w-4 h-4 text-mine-clair" />
              </button>

              <h2 className="text-base font-medium text-encre mb-1">
                Supprimer le projet
              </h2>
              <p className="text-[13px] text-mine mb-5">
                Êtes-vous sûr de vouloir supprimer{' '}
                <span className="font-medium text-encre">"{projectToDelete?.name}"</span> ?
                Cette action est irréversible.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setProjectToDelete(null)
                  }}
                  className="px-4 py-2 text-[13px] font-medium text-encre bg-white border border-filet rounded-[4px] hover:bg-survol transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteProject}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-alerte rounded-[4px] hover:bg-alerte transition-colors"
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