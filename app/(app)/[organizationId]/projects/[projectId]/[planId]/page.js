'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import ImageCanvas from '@/components/ImageCanvas'
import PinsList from '@/components/PinsList'
import NavBar from '@/components/NavBar'
import FullScreenLoader, { FullScreenMessage } from '@/components/FullScreenLoader'
import { useUserData } from '@/hooks/useUserData'
import { usePlanPins } from '@/hooks/usePins'
import { usePinFilters } from '@/hooks/usePinFilters'
import { useProjectData } from '@/providers/ProjectProvider'
import { matchesPinFilters } from '@/lib/data/pinFilters'

const EMPTY = []

export default function PlanPage({ params }) {
  const { projectId, planId, organizationId } = params
  const { profile, isAdmin } = useUserData(organizationId)
  const { project, plans, currentPlan, isLoading: projectLoading, notFound } = useProjectData()

  const { data: pins = EMPTY, isPending: pinsLoading } = usePlanPins(planId)
  const { filters } = usePinFilters()

  // Liste dérivée : calculée, jamais stockée. Elle ne peut pas se désynchroniser.
  const filteredPins = useMemo(
    () => pins.filter((pin) => matchesPinFilters(pin, filters, { profileId: profile?.id })),
    [pins, filters, profile?.id]
  )

  if (projectLoading) return <FullScreenLoader />

  if (notFound || !project) {
    return (
      <FullScreenMessage title="Projet introuvable" message="Ce projet n'existe pas ou vous n'y avez pas accès.">
        <Link href={`/${organizationId}/projects`} className="text-[13px] font-medium text-[#0d0d0c] underline">
          Retour aux projets
        </Link>
      </FullScreenMessage>
    )
  }

  if (!currentPlan) {
    return (
      <FullScreenMessage title="Plan introuvable" message="Ce plan a été supprimé ou n'appartient pas à ce projet.">
        <Link
          href={`/${organizationId}/projects/${projectId}`}
          className="text-[13px] font-medium text-[#0d0d0c] underline"
        >
          Ouvrir le projet
        </Link>
      </FullScreenMessage>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background font-sans">
      <div className="relative z-50">
        <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 overflow-y-auto border-r border-border/40 bg-secondary/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PinsList
            pins={filteredPins}
            allPins={pins}
            plans={plans}
            currentPlan={currentPlan}
            projectId={projectId}
            organizationId={organizationId}
            isLoading={pinsLoading}
          />
        </div>

        <div className="flex-1 overflow-auto">
          {currentPlan.png_url && (
            <ImageCanvas
              key={currentPlan.id}
              imageUrl={supabase.storage.from('project-plans').getPublicUrl(currentPlan.png_url).data.publicUrl}
              pins={filteredPins}
              project={project}
              plan={currentPlan}
              user={profile}
              organizationId={organizationId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
