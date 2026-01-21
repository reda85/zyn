'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { createBrowserClient } from '@supabase/ssr';
import { useAtom } from 'jotai';
import { selectedOrganizationAtom } from '@/store/atoms';
import { supabase } from '@/utils/supabaseClient';

export function useUserData() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [organization, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

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
        .select(`*,members(count)`)
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Organization error:', orgError);
        return;
      }

      setSelectedOrganization(organization);
    };

    fetchUserData();
  }, [user]);

  return { user, profile, organization };
}
