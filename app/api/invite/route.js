import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient, findMembersByEmail } from '@/lib/supabaseAdmin'

// Rôles qu'un administrateur peut attribuer depuis l'écran Membres.
const ASSIGNABLE_ROLES = ['admin', 'Membres', 'guest']
const ADMIN_ROLES = ['admin', 'owner', 'super_admin']

const json = (body, status = 200) => NextResponse.json(body, { status })

const isAlreadyRegistered = (error) =>
  error?.code === 'email_exists' || /already (been )?registered/i.test(error?.message || '')

/**
 * POST /api/invite
 * { email, name, role, organizationId, memberId?, projects? }
 *
 * Invite une personne dans une organisation :
 *  - nouvelle adresse            → email d'invitation (lien vers /accept-invite) ;
 *  - compte déjà existant        → simple ajout à l'organisation, sans email ;
 *  - invitation jamais acceptée  → l'email est renvoyé.
 *
 * Réservé aux administrateurs de l'organisation visée.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    const email = body?.email?.toString().trim().toLowerCase()
    const name = body?.name?.toString().trim() || null
    // Le rôle n'est requis que si la personne n'est pas encore dans l'organisation.
    const role = ASSIGNABLE_ROLES.includes(body?.role) ? body.role : null
    const organizationId = body?.organizationId
    const memberId = body?.memberId || null
    const projects = Array.isArray(body?.projects) ? body.projects : []

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Adresse email invalide' }, 400)
    if (!organizationId) return json({ error: 'Organisation manquante' }, 400)

    // ── 1. Qui appelle ? ────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Non authentifié' }, 401)

    const admin = createAdminClient()

    const { data: caller } = await admin.from('members').select('id').eq('auth_id', user.id).maybeSingle()
    const { data: callerMemberships } = caller
      ? await admin.from('members_organizations').select('organization_id, role').eq('member_id', caller.id)
      : { data: [] }
    const canInvite = (callerMemberships ?? []).some(
      (m) => m.role === 'super_admin' || (m.organization_id === organizationId && ADMIN_ROLES.includes(m.role))
    )
    if (!canInvite) return json({ error: "Seul un administrateur de l'organisation peut inviter" }, 403)

    // ── 2. Fiche membre visée ───────────────────────────────────────────────
    let member = null
    if (memberId) {
      const { data } = await admin.from('members').select('*').eq('id', memberId).maybeSingle()
      // La fiche doit déjà appartenir à cette organisation.
      const { data: link } = data
        ? await admin
            .from('members_organizations')
            .select('id')
            .eq('member_id', data.id)
            .eq('organization_id', organizationId)
            .maybeSingle()
        : { data: null }
      if (!data || !link) return json({ error: 'Membre introuvable dans cette organisation' }, 404)
      member = data
    } else {
      const candidates = await findMembersByEmail(admin, email)
      member = candidates.find((m) => m.auth_id) ?? candidates[0] ?? null
    }

    // ── 3. Compte d'authentification ────────────────────────────────────────
    const origin = new URL(request.url).origin
    let authUserId = member?.auth_id ?? null
    let emailSent = false

    // Compte créé par une invitation jamais acceptée (lien expiré) : on renvoie l'email.
    let neverSignedIn = false
    if (authUserId) {
      const { data: existing } = await admin.auth.admin.getUserById(authUserId)
      if (!existing?.user) authUserId = null // fiche rattachée à un compte supprimé
      else neverSignedIn = !existing.user.last_sign_in_at
    }

    if (!authUserId || neverSignedIn) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/accept-invite`,
        data: { name, role, organization_id: organizationId },
      })

      if (!inviteError) {
        authUserId = invited.user.id
        emailSent = true
      } else if (isAlreadyRegistered(inviteError)) {
        // Le compte existe déjà (autre organisation, inscription directe…) :
        // on récupère son identifiant sans envoyer d'email.
        if (!authUserId) {
          const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
          if (linkError) throw linkError
          authUserId = link.user.id
        }
      } else {
        throw inviteError
      }
    }

    // ── 4. Fiche membre : création ou mise à jour ───────────────────────────
    if (member) {
      const patch = { invited: true }
      if (member.auth_id !== authUserId && authUserId) patch.auth_id = authUserId
      if ((member.email || '').toLowerCase() !== email) patch.email = email
      if (!member.status) patch.status = 'pending'
      const { data: updated, error } = await admin.from('members').update(patch).eq('id', member.id).select().single()
      if (error) throw error
      member = updated
    } else {
      const { data: created, error } = await admin
        .from('members')
        .insert({ name, email, status: 'pending', invited: true, auth_id: authUserId })
        .select()
        .single()
      if (error) throw error
      member = created
    }

    // ── 5. Rattachement à l'organisation ────────────────────────────────────
    const { data: existingLink } = await admin
      .from('members_organizations')
      .select('id')
      .eq('member_id', member.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existingLink) {
      const { error } = await admin.from('members_organizations').update({ invited: true }).eq('id', existingLink.id)
      if (error) throw error
    } else {
      if (!role) return json({ error: 'Rôle invalide' }, 400)
      const { error } = await admin
        .from('members_organizations')
        .insert({ member_id: member.id, organization_id: organizationId, role, invited: true })
      if (error) throw error
    }

    // ── 6. Projets (de cette organisation uniquement, sans doublon) ─────────
    if (projects.length > 0) {
      const { data: allowed } = await admin
        .from('projects')
        .select('id')
        .eq('organization_id', organizationId)
        .in('id', projects)
      const { data: already } = await admin.from('members_projects').select('project_id').eq('member_id', member.id)
      const known = new Set((already ?? []).map((r) => r.project_id))
      const rows = (allowed ?? [])
        .filter((p) => !known.has(p.id))
        .map((p) => ({ member_id: member.id, project_id: p.id }))
      if (rows.length > 0) {
        const { error } = await admin.from('members_projects').insert(rows)
        if (error) throw error
      }
    }

    return json({
      success: true,
      member,
      emailSent,
      message: emailSent
        ? "Invitation envoyée par email."
        : "Cette personne a déjà un compte : elle a été ajoutée à l'organisation et peut se connecter directement.",
    })
  } catch (error) {
    console.error('Invite API error:', error)
    const message =
      error?.status === 429
        ? "Trop d'invitations envoyées. Patientez quelques minutes."
        : error?.message || "Erreur lors de l'envoi de l'invitation"
    return json({ error: message }, 500)
  }
}
