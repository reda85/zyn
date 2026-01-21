import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';

import { UserProviderWrapper } from '../../components/UserPoviderWrapper';
import { useUserData } from '@/hooks/useUserData';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const {user} = useUserData();

  console.log('user', user)

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <UserProviderWrapper user={user}>
      {children}
    </UserProviderWrapper>
  );
}
