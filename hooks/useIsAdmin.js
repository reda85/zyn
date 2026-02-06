// hooks/useIsAdmin.js
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useUserData } from './useUserData';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, organization } = useUserData();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user || !organization) {
        setIsLoading(false);
        return;
      }

      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('email', user.email)
        .eq('organization_id', organization.id)
        .maybeSingle();

      setIsAdmin(member?.role === 'admin');
      setIsLoading(false);
    };

    checkAdmin();
  }, [user, organization]);

  return { isAdmin, isLoading };
}