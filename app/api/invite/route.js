import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, name, role, organizationId, projects } = await request.json()

    // Get the origin - use the actual deployment URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://zaynspace.com'
    
    // IMPORTANT: Don't add /accept-invite here, just use the base domain
    // Supabase will handle the redirect via email template
    const redirectUrl = origin
    // Use root domain for redirectTo (since accept-invite lives there)


// or hardcode for now to test:
const redirectTo = 'https://app.zaynspace.com/accept-invite';
    
    console.log('Sending invite with base URL:', redirectUrl)

    // Send auth invitation
   const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
  email,
  {
    redirectTo: `${redirectTo}`,   // ← this is what you want
    data: { 
      name, 
      role, 
      organization_id: organizationId 
    }
  }
)
    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

  // 1. Check if member already exists
let member
const { data: existingMember } = await supabaseAdmin
  .from('members')
  .select()
  .eq('email', email)
  .maybeSingle()

if (existingMember) {
  // 2. Already exists — check they're not already in this org
  const { data: existingOrgMember } = await supabaseAdmin
    .from('members_organizations')
    .select()
    .eq('member_id', existingMember.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (existingOrgMember) {
    return Response.json({ error: 'Ce membre appartient déjà à cette organisation' }, { status: 400 })
  }

  member = existingMember
} else {
  // 3. New member — send auth invite and create record
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email, { redirectTo, data: { name, role, organization_id: organizationId } }
  )
  if (authError) throw authError

  const { data: newMember, error: memberError } = await supabaseAdmin
    .from('members')
    .insert({ name, email, status: 'pending', auth_id: authData.user.id })
    .select()
    .single()

  if (memberError) throw memberError
  member = newMember
}

// 4. Always insert into members_organizations
const { error: orgMemberError } = await supabaseAdmin
  .from('members_organizations')
  .insert({ member_id: member.id, organization_id: organizationId, role })

if (orgMemberError) throw orgMemberError
    return Response.json({ success: true, member })
  } catch (error) {
    console.error('Invite API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}