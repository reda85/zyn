import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, name, role, organizationId, projects } = await request.json()

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL
    console.log('Origin:', origin)
    // Une seule ligne à changer
const redirectTo = `${origin}/accept-invite`

    let member

    // 1. Check existing member
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select()
      .eq('email', email)
      .maybeSingle()

    if (existingMember) {
      member = existingMember

      const { data: existingOrgMember } = await supabaseAdmin
        .from('members_organizations')
        .select()
        .eq('member_id', existingMember.id)
        .eq('organization_id', organizationId)
        .maybeSingle()

      // Member already invited
      if (existingOrgMember?.invited) {
        return Response.json(
          { error: 'Ce membre appartient déjà à cette organisation' },
          { status: 400 }
        )
      }

      // Existing org member but not invited -> resend invite
      if (existingOrgMember && !existingOrgMember.invited) {
        const { error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
              name,
              role,
              organization_id: organizationId,
            },
          })

        if (inviteError) throw inviteError

        // Mettre à jour auth_id dans members
  const { error: updateMemberError } = await supabaseAdmin
    .from('members')
    .update({ auth_id: authData.user.id, organization_id: organizationId, role })
    .eq('id', existingMember.id)

  if (updateMemberError) throw updateMemberError


        // Update invited flag
        const { error: updateError } = await supabaseAdmin
          .from('members_organizations')
          .update({ invited: true })
          .eq('member_id', existingMember.id)
          .eq('organization_id', organizationId)

        if (updateError) throw updateError
      }

      // Existing member but no org relation yet
      if (!existingOrgMember) {
        const { error: orgError } = await supabaseAdmin
          .from('members_organizations')
          .insert({
            member_id: member.id,
            organization_id: organizationId,
            role,
            invited: true,
          })

        if (orgError) throw orgError

        const { error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
              name,
              role,
              organization_id: organizationId,
            },
          })

        if (inviteError) throw inviteError
      }
    } else {
      // 2. New member
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: {
            name,
            role,
            organization_id: organizationId,
          },
        })

      if (authError) throw authError

      const { data: newMember, error: memberError } = await supabaseAdmin
        .from('members')
        .insert({
          name,
          email,
          status: 'pending',
          invited: true,
          auth_id: authData.user.id,
          organization_id: organizationId,
          role,
        })
        .select()
        .single()

      if (memberError) throw memberError

      member = newMember

      const { error: orgError } = await supabaseAdmin
        .from('members_organizations')
        .insert({
          member_id: member.id,
          organization_id: organizationId,
          role,
          invited: true,
        })

      if (orgError) throw orgError
    }

    // 3. Assign projects
    if (projects && projects.length > 0) {
      const rows = projects.map((projectId) => ({
        member_id: member.id,
        project_id: projectId,
      }))

      const { error: projectsError } = await supabaseAdmin
        .from('members_projects')
        .insert(rows)

      if (projectsError) throw projectsError
    }

    return Response.json({ success: true, member })
  } catch (error) {
    console.error('Invite API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}