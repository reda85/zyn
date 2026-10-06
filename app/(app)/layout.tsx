import { redirect } from 'next/navigation';
import { loadSession } from '@/lib/session';
import { SessionProvider } from '@/providers/SessionProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { signOutAction } from '@/app/actions';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await loadSession();

  if (!session) {
    redirect('/sign-in');
  }

  if (!session.profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fafaf9] px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-[17px] font-medium text-[#050505] mb-2">Aucun espace de travail</h1>
          <p className="text-[13px] text-[#666660] mb-6">
            Le compte {session.user.email} n&apos;est rattaché à aucune organisation. Demandez une
            invitation à l&apos;administrateur de votre espace.
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="px-3 py-[7px] bg-[#0d0d0c] text-white rounded-[4px] text-[13px] font-medium hover:bg-[#1a1a18] transition-colors"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      <SessionProvider
        user={session.user}
        profile={session.profile}
        memberships={session.memberships}
      >
        {children}
      </SessionProvider>
    </QueryProvider>
  );
}
