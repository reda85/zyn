'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FullScreenLoader, { FullScreenMessage } from '@/components/FullScreenLoader'
import { useProjectData } from '@/providers/ProjectProvider'

// Accueil d'un projet : ouvre son premier plan, ou la gestion des plans s'il n'en a pas.
export default function ProjectHome({ params }) {
  const { projectId, organizationId } = params
  const { plans, isLoading, notFound } = useProjectData()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || notFound) return
    const base = `/${organizationId}/projects/${projectId}`
    router.replace(plans.length > 0 ? `${base}/${plans[0].id}` : `${base}/sources`)
  }, [isLoading, notFound, plans, organizationId, projectId, router])

  if (notFound) {
    return (
      <FullScreenMessage title="Projet introuvable" message="Ce projet n'existe pas ou vous n'y avez pas accès.">
        <Link href={`/${organizationId}/projects`} className="text-[13px] font-medium text-[#0d0d0c] underline">
          Retour aux projets
        </Link>
      </FullScreenMessage>
    )
  }

  return <FullScreenLoader />
}
