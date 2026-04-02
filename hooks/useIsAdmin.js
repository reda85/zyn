// hooks/useIsAdmin.js
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useUserData } from './useUserData';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, organization } = useUserData();

  useEffect(() => {
    if (!profile || !organization) {
      setIsLoading(false);
      return;
    }

    setIsAdmin(false);
    setIsLoading(true);

    const checkAdmin = async () => {
      const { data: memberOrg } = await supabase
        .from('members_organizations')
        .select('role')
        .eq('member_id', profile.id)  // profile.id et non user.id
        .eq('organization_id', organization.id)
        .maybeSingle();

      setIsAdmin(memberOrg?.role === 'admin');
      setIsLoading(false);
    };

    checkAdmin();
  }, [profile, organization]);

  return { isAdmin, isLoading };
}