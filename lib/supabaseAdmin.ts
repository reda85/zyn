import { createClient } from "@supabase/supabase-js";

/** Client « service role » (contourne les RLS). Serveur uniquement, jamais exposé au navigateur. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ligne `members` dont l'email correspond, sans tenir compte de la casse. */
export async function findMembersByEmail(client: any, email: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await client
    .from("members")
    .select("*")
    .ilike("email", normalized.replace(/[\\%_]/g, (c) => `\\${c}`));
  if (error) throw error;
  return (data ?? []).filter((m: any) => (m.email || "").trim().toLowerCase() === normalized);
}
