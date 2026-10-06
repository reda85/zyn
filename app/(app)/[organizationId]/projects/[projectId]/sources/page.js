'use client'

import ProjectPlans from '@/components/ProjectPlans'
import FullScreenLoader, { FullScreenMessage } from '@/components/FullScreenLoader'
import { useProjectData } from '@/providers/ProjectProvider'

export default function ProjectSources() {
  const { project, isLoading, notFound } = useProjectData()

  if (notFound) return <FullScreenMessage title="Projet introuvable" message="Ce projet n'existe pas ou vous n'y avez pas accès." />
  if (isLoading || !project) return <FullScreenLoader />

  return (
    <div className="bg-background min-h-screen font-sans">
      <ProjectPlans project={project} />
    </div>
  )
}
