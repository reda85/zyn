import { cache } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export type Membership = {
  role: string | null;
  organization: Record<string, any>;
};

export type Session = {
  user: User;
  profile: Record<string, any> | null;
  memberships: Membership[];
};

/**
 * Rattache une ligne `members` créée par invitation (sans auth_id) au compte
 * authentifié. Fait côté serveur, sur l'email vérifié par Supabase Auth, pour
 * que le navigateur n'ait plus jamais à écrire dans `members.auth_id`.
 */
async function linkMemberByEmail(supabase: any, user: User) {
  if (!user.email) return null;

  // Comparaison insensible à la casse : Supabase Auth normalise l'email en
  // minuscules, alors que la ligne `members` a pu être saisie avec des majuscules.
  const email = user.email.toLowerCase();
  const { data: candidates } = await supabase
    .from("members")
    .select("*")
    .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .is("auth_id", null);
  const byEmail = (candidates ?? []).find((m: any) => (m.email || "").toLowerCase() === email);

  if (!byEmail) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const writer = serviceKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : supabase;

  const { error } = await writer
    .from("members")
    .update({ auth_id: user.id })
    .eq("id", byEmail.id)
    .is("auth_id", null);

  if (error) {
    console.error("[session] linking member to auth user failed:", error.message);
    return null;
  }
  return { ...byEmail, auth_id: user.id };
}

/**
 * Charge une seule fois par requête l'utilisateur, son profil `members` et ses
 * organisations. `cache()` dédoublonne les appels entre layout et pages.
 */
export const loadSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: profile } = await supabase
    .from("members")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) profile = await linkMemberByEmail(supabase, user);
  if (!profile) return { user, profile: null, memberships: [] };

  const { data: memberships, error } = await supabase
    .from("members_organizations")
    .select("role, organization:organizations(*, members_organizations(count))")
    .eq("member_id", profile.id);

  if (error) console.error("[session] memberships:", error.message);

  return {
    user,
    profile,
    memberships: ((memberships ?? []) as any[]).filter((m) => m.organization),
  };
});
