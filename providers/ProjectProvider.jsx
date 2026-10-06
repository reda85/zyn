'use client'

import { createContext, useContext, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase/client'
import { qk } from '@/lib/data/keys'

const EMPTY = []

const ProjectContext = createContext({
  projectId: null,
  project: null,
  plans: EMPTY,
  currentPlan: null,
  categories: EMPTY,
  statuses: EMPTY,
  isLoading: false,
  isReady: false,
  notFound: false,
})

async function fetchProject(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, plans(*)')
    .eq('id', projectId)
    .is('plans.deleted_at', null)
    .order('created_at', { referencedTable: 'plans', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data
}

async function fetchOrdered(table, projectId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('project_id', projectId)
    .order('order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Données communes à toutes les pages d'un projet : le projet, ses plans, ses
 * catégories et ses statuts. Chargées une fois par projet (clé = projectId) et
 * partagées par contexte, au lieu d'être refetchées et recopiées dans des
 * atoms par chaque page.
 */
export function ProjectProvider({ projectId, children }) {
  const params = useParams()
  const planId = params?.planId ?? null

  const projectQuery = useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(projectId),
  })
  const categoriesQuery = useQuery({
    queryKey: qk.categories(projectId),
    queryFn: () => fetchOrdered('categories', projectId),
    enabled: Boolean(projectId),
  })
  const statusesQuery = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => fetchOrdered('Status', projectId),
    enabled: Boolean(projectId),
  })

  const project = projectQuery.data ?? null
  const categories = categoriesQuery.data ?? EMPTY
  const statuses = statusesQuery.data ?? EMPTY
  const isLoading = projectQuery.isPending || categoriesQuery.isPending || statusesQuery.isPending
  const isReady = projectQuery.isSuccess && categoriesQuery.isSuccess && statusesQuery.isSuccess
  const notFound = projectQuery.isSuccess && !projectQuery.data

  const value = useMemo(() => {
    const plans = project?.plans ?? EMPTY
    return {
      projectId,
      project,
      plans,
      currentPlan: planId ? plans.find((p) => p.id === planId) ?? null : null,
      categories,
      statuses,
      isLoading,
      isReady,
      notFound,
    }
  }, [projectId, planId, project, categories, statuses, isLoading, isReady, notFound])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectData() {
  return useContext(ProjectContext)
}

/** Mises à jour locales du cache du projet (pages de configuration). */
export function useProjectCache() {
  const queryClient = useQueryClient()
  return useMemo(
    () => ({
      setCategories: (projectId, updater) => queryClient.setQueryData(qk.categories(projectId), updater),
      setStatuses: (projectId, updater) => queryClient.setQueryData(qk.statuses(projectId), updater),
      setProject: (projectId, updater) => queryClient.setQueryData(qk.project(projectId), updater),
      invalidateProject: (projectId) => queryClient.invalidateQueries({ queryKey: qk.project(projectId) }),
    }),
    [queryClient]
  )
}
