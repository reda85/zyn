import { useParams } from 'next/navigation'
import { useSession } from '@/providers/SessionProvider'

const EMPTY = { role: null, organization: null, isAdmin: false, profile: null }

/**
 * Utilisateur, profil et organisation courante, lus depuis le contexte de
 * session (aucune requête). L'organisation est, dans l'ordre : celle passée en
 * argument, celle de l'URL (`/[organizationId]/…`), sinon la première.
 *
 * `profile.role` est le rôle dans l'organisation courante.
 * `isLoading` est conservé pour compatibilité et vaut toujours `false`.
 */
export function useUserData(organizationId = null) {
  const { user, baseProfile, organizations, byOrganization } = useSession()
  const params = useParams()

  const targetId = organizationId ?? params?.organizationId ?? organizations[0]?.id ?? null
  const scoped = (targetId && byOrganization.get(targetId)) || EMPTY

  return {
    user,
    profile: scoped.profile ?? (targetId ? null : baseProfile),
    organization: scoped.organization,
    organizations,
    role: scoped.role,
    isAdmin: scoped.isAdmin,
    isLoading: false,
  }
}
