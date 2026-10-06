import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Anciennes URL `/projects/...` (liens déjà envoyés, favoris) : on retrouve
// l'organisation du projet et on redirige vers `/[organizationId]/projects/...`.
export default async function LegacyProjectRedirect({ params }) {
  const [projectId, ...rest] = params.slug ?? []
  if (!projectId) redirect('/workspaces')

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project?.organization_id) redirect('/workspaces')

  const tail = rest.length ? `/${rest.map(encodeURIComponent).join('/')}` : ''
  redirect(`/${project.organization_id}/projects/${projectId}${tail}`)
}
