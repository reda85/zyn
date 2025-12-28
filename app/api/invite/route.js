import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only!
)

export async function POST(request) {
  try {
    const { email, name, role, organizationId, projects } = await request.json()

    // Send auth invitation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { name, role, organization_id: organizationId },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`
      }
    )

    if (authError) throw authError

    // Create member record
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        name,
        email,
        role,
        organization_id: organizationId,
        status: 'pending',
        auth_id: authData.user.id
      })
      .select()
      .single()

    if (memberError) throw memberError

    // Assign projects
    if (projects?.length > 0) {
      await supabaseAdmin.from('members_projects').insert(
        projects.map(projectId => ({
          member_id: member.id,
          project_id: projectId
        }))
      )
    }

    return Response.json({ success: true, member })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}