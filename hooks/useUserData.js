'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { createBrowserClient } from '@supabase/ssr';
import { useAtom } from 'jotai';
import { selectedOrganizationAtom } from '@/store/atoms';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useUserData() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [organization, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      // Fetch member profile
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

      // Fetch current/selected organization (with member count)
      // In useUserData, change the org-fetch block:
const { data: organization, error: orgError } = await supabase
  .from('organizations')
  .select(`*, members(count)`)
  .eq('id', profile.organization_id)
  .single();

if (orgError) {
  console.error('Organization error:', orgError);
  return;
}

// Only set the default org if none is selected yet
setSelectedOrganization((current) => current ?? organization);

      // Fetch all organizations the user belongs to via members_organizations
      const { data: memberships, error: membershipsError } = await supabase
        .from('members_organizations')
        .select(`organization:organizations(*, members(count))`)
        .eq('member_id', profile.id);

      if (membershipsError) {
        console.error('Memberships error:', membershipsError);
        // Fallback: at minimum expose the current org
        setOrganizations([organization]);
        return;
      }

      const allOrgs = memberships
        .map((m) => m.organization)
        .filter(Boolean);

      // Ensure current org is always in the list even if the join returns nothing
      const hasCurrentOrg = allOrgs.some((o) => o.id === organization.id);
      setOrganizations(hasCurrentOrg ? allOrgs : [organization, ...allOrgs]);
    };

    fetchUserData();
  }, [user]);

  return { user, profile, organization, organizations };
}