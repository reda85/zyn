'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useUserData() {
  const user = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const { data: profile, error: profileError } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        return;
      }

      setProfile(profile);

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Organization error:', orgError);
        return;
      }

      setOrganization(organization);
    };

    fetchUserData();
  }, [user]);

  return { user, profile, organization };
}
