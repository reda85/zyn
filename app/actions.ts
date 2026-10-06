"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient, getRequestOrigin } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, findMembersByEmail } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = await getRequestOrigin();

  if (!email || !password) {
    return encodedRedirect("error", "/sign-up", "Email and password are required");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/workspaces");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString().trim();
  const origin = await getRequestOrigin();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "L'adresse email est requise.");
  }

  // Flux « implicite » volontairement : le lien reçu par email porte lui-même
  // les jetons, il fonctionne donc dans n'importe quel navigateur ou appareil.
  // Avec le flux PKCE (défaut côté serveur), le lien n'est valable que dans le
  // navigateur qui a fait la demande, d'où des liens « expirés » à tort.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("[forgot-password]", error.message);
    const message =
      error.status === 429
        ? "Trop de demandes. Patientez quelques minutes avant de réessayer."
        : "Impossible d'envoyer l'email de réinitialisation. Réessayez.";
    return encodedRedirect("error", "/forgot-password", message);
  }

  // Même message que l'adresse existe ou non : on ne révèle pas quels comptes existent.
  return encodedRedirect(
    "success",
    "/forgot-password",
    "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
  );
};

/**
 * Fin d'une invitation (ou d'une réinitialisation) : rattache la ligne
 * `members` au compte authentifié et la passe en « active ».
 * Fait côté serveur, sur l'email vérifié par Supabase Auth.
 */
export const activateMembershipAction = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, organizationId: null };

  const admin = createAdminClient();
  const { data: linked } = await admin.from("members").select("*").eq("auth_id", user.id).maybeSingle();
  let member = linked;

  if (!member) {
    const candidates = await findMembersByEmail(admin, user.email);
    member = candidates.find((m: any) => !m.auth_id) ?? null;
  }
  if (!member) return { ok: false, organizationId: null };

  const { error } = await admin
    .from("members")
    .update({ auth_id: user.id, status: "active" })
    .eq("id", member.id);
  if (error) {
    console.error("[activate-membership]", error.message);
    return { ok: false, organizationId: null };
  }

  const { data: memberships } = await admin
    .from("members_organizations")
    .select("organization_id")
    .eq("member_id", member.id);

  const invitedTo = user.user_metadata?.organization_id;
  const organizationId =
    memberships?.find((m: any) => m.organization_id === invitedTo)?.organization_id ??
    memberships?.[0]?.organization_id ??
    null;

  return { ok: true, organizationId };
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};