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
  const [, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const { data: profile, error: profileError } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (profileError) { console.error(profileError); return; }
      

      // Fetch memberships first to get all orgs
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('members_organizations')
        .select(`role, organization:organizations(*, members_organizations(count))`)
        .eq('member_id', profile.id);

      if (membershipsError) { console.error(membershipsError); return; }

      setMemberships(membershipsData);
      const allOrgs = membershipsData.map((m) => m.organization).filter(Boolean);
      setOrganizations(allOrgs);

      // Use organizationId from param, fallback to first membership org
      const targetId = organizationId ?? allOrgs[0]?.id;
      if (!targetId) return;

      const membership = membershipsData.find((m) => m.organization?.id === targetId);
const org = allOrgs.find((o) => o.id === targetId) ?? null;

// Enrichir le profil avec le rôle de members_organizations
setProfile({ ...profile, role: membership?.role ?? null });

      if (org) {
        setOrganization(org);
        setSelectedOrganization(org);
      } else {
        // Not in allOrgs (e.g. admin accessing another org), fetch it
        const { data: fetchedOrg, error: orgError } = await supabase
          .from('organizations')
          .select(`*, members_organizations(count)`)
          .eq('id', targetId)
          .single();

        if (orgError) { console.error(orgError); return; }
        setOrganization(fetchedOrg);
        setSelectedOrganization(fetchedOrg);
      }
    };

    fetchUserData();
  }, [user, organizationId]);

  const currentRole = organization
    ? memberships.find((m) => m.organization?.id === organization.id)?.role ?? null
    : null;

  const isAdmin = currentRole === 'admin';

  return { user, profile, organization, organizations, isAdmin };
}