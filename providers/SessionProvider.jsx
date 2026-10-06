'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSetAtom } from 'jotai'
import { selectedOrganizationAtom } from '@/store/atoms'
import { UserContext } from '@/components/UserContext'
import { supabase } from '@/utils/supabase/client'

const ADMIN_ROLES = ['admin', 'owner', 'super_admin']

const SessionContext = createContext(null)

/**
 * Source unique de vérité pour l'utilisateur, son profil et ses organisations.
 * Les données viennent du layout serveur : aucun composant ne refait de requête.
 *
 * Pour chaque organisation on précalcule un objet stable
 * `{ profile (avec le rôle dans CETTE organisation), organization, role, isAdmin }`
 * afin que les `useEffect` qui dépendent de `profile` ne se relancent pas.
 */
export function SessionProvider({ user, profile, memberships, children }) {
  const params = useParams()
  const urlOrganizationId = params?.organizationId ?? null

  // Organisation de l'URL dont l'utilisateur n'est pas membre (cas du
  // super-admin qui consulte l'espace d'un client) : chargée une fois, via RLS.
  const [visitedOrganization, setVisitedOrganization] = useState(null)
  const isMemberOfUrlOrganization = memberships.some((m) => m.organization.id === urlOrganizationId)

  useEffect(() => {
    if (!urlOrganizationId || isMemberOfUrlOrganization || !profile) return
    let cancelled = false
    supabase
      .from('organizations')
      .select('*, members_organizations(count)')
      .eq('id', urlOrganizationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setVisitedOrganization(data ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [urlOrganizationId, isMemberOfUrlOrganization, profile])

  const value = useMemo(() => {
    const organizations = memberships.map((m) => m.organization)
    const isSuperAdmin = memberships.some((m) => m.role === 'super_admin')
    const byOrganization = new Map()
    for (const m of memberships) {
      const role = m.role ?? null
      byOrganization.set(m.organization.id, {
        role,
        organization: m.organization,
        isAdmin: isSuperAdmin || ADMIN_ROLES.includes(role),
        profile: profile ? { ...profile, role } : null,
      })
    }
    if (visitedOrganization && !byOrganization.has(visitedOrganization.id)) {
      const role = isSuperAdmin ? 'super_admin' : null
      byOrganization.set(visitedOrganization.id, {
        role,
        organization: visitedOrganization,
        isAdmin: isSuperAdmin,
        profile: profile ? { ...profile, role } : null,
      })
    }
    return { user, baseProfile: profile, memberships, organizations, byOrganization, isSuperAdmin }
  }, [user, profile, memberships, visitedOrganization])

  // Un seul endroit écrit l'organisation courante : elle suit l'URL.
  const setSelectedOrganization = useSetAtom(selectedOrganizationAtom)
  const currentOrganization =
    (urlOrganizationId && value.byOrganization.get(urlOrganizationId)?.organization) || null
  useEffect(() => {
    if (currentOrganization) setSelectedOrganization(currentOrganization)
  }, [currentOrganization, setSelectedOrganization])

  return (
    <UserContext.Provider value={user}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </UserContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession doit être utilisé sous <SessionProvider>')
  return ctx
}
