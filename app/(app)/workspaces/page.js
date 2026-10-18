import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { signOutAction } from '@/app/actions'

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
        <h1 className="text-[17px] font-medium text-[#050505] mb-2">Aucune organisation</h1>
        <p className="text-[13px] text-[#666660] mb-6">
          Le compte {session.user.email} n&apos;est membre d&apos;aucune organisation pour le moment.
          Demandez à l&apos;administrateur de votre espace de vous y ajouter, ou connectez-vous avec
          un autre compte.
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="px-3 py-[7px] bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
          >
            Changer de compte
          </button>
        </form>
      </div>
    </div>
  )
}
