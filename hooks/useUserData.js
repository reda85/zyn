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
  const [isLoading, setIsLoading] = useState(true);
  const [, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

  useEffect(() => {
    if (user === undefined) return;

    if (user === null) {
      setIsLoading(false);
      return;
    }

    console.log('useUserData', user, organizationId);

    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // 1. Chercher par auth_id
        let { data: profile } = await supabase
          .from('members')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        // 2. Fallback : chercher par email et mettre à jour auth_id
        if (!profile) {
          const { data: profileByEmail } = await supabase
            .from('members')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (profileByEmail) {
            await supabase
              .from('members')
              .update({ auth_id: user.id })
              .eq('id', profileByEmail.id);
            profile = { ...profileByEmail, auth_id: user.id };
          } else {
            console.warn('No members record found for user:', user.email);
            return;
          }
        }

        // 3. Récupérer les memberships
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('members_organizations')
          .select(`role, organization:organizations(*, members_organizations(count))`)
          .eq('member_id', profile.id);

        if (membershipsError) { console.error(membershipsError); return; }

        setMemberships(membershipsData);
        const allOrgs = membershipsData.map((m) => m.organization).filter(Boolean);
        setOrganizations(allOrgs);

        const targetId = organizationId ?? allOrgs[0]?.id;
        if (!targetId) {
          console.warn('No organization found for member:', profile.id);
          return;
        }

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
        setIsLoading(false);
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