import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'

// Point d'entrée après connexion : envoie vers la première organisation.
// Le layout parent gère déjà « non connecté » et « aucun profil ».
export default async function Workspaces() {
  const session = await loadSession()
  if (!session) redirect('/sign-in')

  const first = session.memberships[0]?.organization
  if (first) redirect(`/${first.id}/projects`)

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#fafaf9] px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[17px] font-medium text-[#050505] mb-2">Organisation introuvable</h1>
        <p className="text-[13px] text-[#666660]">
          Votre compte n&apos;est membre d&apos;aucune organisation pour le moment.
        </p>
      </div>
    </div>
  )
}
