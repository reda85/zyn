import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
//import { UserProvider } from '../components/UserProvider'; // ✅ make sure it's correct path
import { UserProviderWrapper } from '../../components/UserPoviderWrapper';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
