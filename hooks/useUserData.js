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
  const [memberships, setMemberships] = useState([]);
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
        .select(`*, members_organizations(count)`)
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Organization error:', orgError);
        return;
      }

      setSelectedOrganization((current) => current ?? organization);

      // Inclure role dans le select
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('members_organizations')
        .select(`role, organization:organizations(*, members_organizations(count))`)
        .eq('member_id', profile.id);

      if (membershipsError) {
        console.error('Memberships error:', membershipsError);
        setOrganizations([organization]);
        return;
      }

      setMemberships(membershipsData);

      const allOrgs = membershipsData.map((m) => m.organization).filter(Boolean);
      const hasCurrentOrg = allOrgs.some((o) => o.id === organization.id);
      setOrganizations(hasCurrentOrg ? allOrgs : [organization, ...allOrgs]);
    };

    fetchUserData();
  }, [user]);

  // Rôle dans l'org courante — pas de re-fetch, pas de loading
  const currentRole = organization
    ? memberships.find((m) => m.organization?.id === organization.id)?.role ?? null
    : null;

  const isAdmin = currentRole === 'admin';

  return { user, profile, organization, organizations, isAdmin };
}