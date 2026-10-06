import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import TaskAssignmentEmail from '../../../components/emails/TaskAssignementEmail'
import { createClient } from '@/utils/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/send-task-notification
 * Email « une tâche vous a été assignée ».
 *
 * Réservé aux utilisateurs connectés, et le destinataire doit être un membre
 * visible par l'appelant (même organisation) : sans ces contrôles, la route
 * servait de relais d'email ouvert au nom de notifications@zaynspace.com.
 */
export async function POST(req) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const {
      assignedUserEmail, assignedUserName, taskName, taskDescription,
      deepLink, projectName, assignedBy, dueDate,
    } = body ?? {}

    if (!assignedUserEmail || !taskName || !deepLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Le lien de l'email ne peut pointer que vers l'application.
    let link
    try {
      link = new URL(deepLink)
    } catch {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }
    const allowedHosts = ['zaynspace.com', 'app.zaynspace.com', new URL(req.url).hostname]
    if (link.protocol !== 'https:' && link.hostname !== 'localhost') {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }
    if (!allowedHosts.includes(link.hostname)) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }

    // Destinataire : un membre que l'appelant a le droit de voir (RLS).
    const email = String(assignedUserEmail).trim().toLowerCase()
    const { data: recipients, error: lookupError } = await supabase
      .from('members')
      .select('id, email')
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
    if (lookupError) throw lookupError
    if (!(recipients ?? []).some((m) => (m.email || '').toLowerCase() === email)) {
      return NextResponse.json({ error: 'Destinataire inconnu' }, { status: 403 })
    }

    const { error } = await resend.emails.send({
      from: 'Zaynspace <notifications@zaynspace.com>',
      to: [email],
      subject: `Nouvelle tâche assignée : ${String(taskName).slice(0, 150)}`,
      react: TaskAssignmentEmail({
        assignedUserName, taskName, taskDescription,
        deepLink: link.toString(), projectName, assignedBy, dueDate,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
