import { useUser } from '@/components/UserContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { selectedOrganizationAtom } from '@/store/atoms';

export function useUserData(organizationId = null) {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // ← starts true
  const [, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

  useEffect(() => {
    // user is null while UserContext is still initializing
    if (user === undefined) return;

    // user is definitively null = not logged in, nothing to fetch
    if (user === null) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('members')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        if (profileError) { console.error(profileError); return; }

        const { data: membershipsData, error: membershipsError } = await supabase
          .from('members_organizations')
          .select(`role, organization:organizations(*, members_organizations(count))`)
          .eq('member_id', profile.id);

        if (membershipsError) { console.error(membershipsError); return; }

        setMemberships(membershipsData);
        const allOrgs = membershipsData.map((m) => m.organization).filter(Boolean);
        setOrganizations(allOrgs);

        const targetId = organizationId ?? allOrgs[0]?.id;
        if (!targetId) return;

        const membership = membershipsData.find((m) => m.organization?.id === targetId);
        const org = allOrgs.find((o) => o.id === targetId) ?? null;

        setProfile({ ...profile, role: membership?.role ?? null });

        if (org) {
          setOrganization(org);
          setSelectedOrganization(org);
        } else {
          const { data: fetchedOrg, error: orgError } = await supabase
            .from('organizations')
            .select(`*, members_organizations(count)`)
            .eq('id', targetId)
            .single();

          if (orgError) { console.error(orgError); return; }
          setOrganization(fetchedOrg);
          setSelectedOrganization(fetchedOrg);
        }
      } finally {
        setIsLoading(false); // ← always clears, even on errors
      }
    };

    fetchUserData();
  }, [user, organizationId]);

  const currentRole = organization
    ? memberships.find((m) => m.organization?.id === organization.id)?.role ?? null
    : null;

  const isAdmin = currentRole === 'admin';

  return { user, profile, organization, organizations, isAdmin, isLoading };
}