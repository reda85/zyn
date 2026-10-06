-- RLS sur les quatre tables qui en étaient dépourvues :
-- members, members_projects, report_templates, user_fcm_tokens.
--
-- Avant : avec la clé publique (anon), n'importe qui pouvait lire, modifier ou
-- supprimer ces lignes. Comme is_org_member / is_org_admin reposent sur
-- members.auth_id, réécrire ce champ permettait d'usurper un membre.
--
-- Retour arrière immédiat si besoin :
--   alter table public.members disable row level security;  (idem pour les autres)

-- ── Fonctions d'aide (SECURITY DEFINER : lisent members sans repasser par ses RLS) ──

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select m.id from members m where m.auth_id = auth.uid()
$$;

-- Vrai si le membre visé partage au moins une organisation avec l'appelant.
create or replace function public.shares_org_with(target_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members_organizations mine
    join members_organizations theirs on theirs.organization_id = mine.organization_id
    where mine.member_id = current_member_id()
      and theirs.member_id = target_member
  )
$$;

-- Vrai si l'appelant administre au moins une organisation.
create or replace function public.is_any_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members_organizations mo
    where mo.member_id = current_member_id() and mo.role in ('admin', 'owner', 'super_admin')
  )
$$;

-- Vrai si l'appelant administre une organisation à laquelle le membre visé appartient.
create or replace function public.is_admin_of_member(target_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members_organizations mine
    join members_organizations theirs on theirs.organization_id = mine.organization_id
    where mine.member_id = current_member_id()
      and mine.role in ('admin', 'owner')
      and theirs.member_id = target_member
  )
$$;

-- Fiche pas encore rattachée à une organisation (juste après sa création par un admin).
create or replace function public.member_is_unattached(target_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from members_organizations mo where mo.member_id = target_member)
$$;

-- Fiche créée par invitation, pas encore liée à un compte, dont l'email est le mien.
-- L'email du jeton est vérifié par Supabase Auth.
create or replace function public.member_is_claimable(member_auth_id uuid, member_email text)
returns boolean language sql stable set search_path = public as $$
  select member_auth_id is null
     and member_email is not null
     and lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

revoke all on function public.current_member_id() from public, anon;
revoke all on function public.shares_org_with(uuid) from public, anon;
revoke all on function public.is_any_org_admin() from public, anon;
revoke all on function public.is_admin_of_member(uuid) from public, anon;
revoke all on function public.member_is_unattached(uuid) from public, anon;
revoke all on function public.member_is_claimable(uuid, text) from public, anon;
grant execute on function public.current_member_id() to authenticated, service_role;
grant execute on function public.shares_org_with(uuid) to authenticated, service_role;
grant execute on function public.is_any_org_admin() to authenticated, service_role;
grant execute on function public.is_admin_of_member(uuid) to authenticated, service_role;
grant execute on function public.member_is_unattached(uuid) to authenticated, service_role;
grant execute on function public.member_is_claimable(uuid, text) to authenticated, service_role;

-- ── members ───────────────────────────────────────────────────────────────────

-- Le lien fiche ↔ compte ne se modifie pas librement : un utilisateur peut
-- seulement revendiquer SA fiche encore libre. Tout le reste passe par le
-- serveur (service role), sinon un administrateur pourrait rattacher la fiche
-- d'un membre à un autre compte et hériter de ses autres organisations.
create or replace function public.members_protect_auth_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.auth_id is distinct from old.auth_id
     and coalesce(auth.role(), '') not in ('service_role', 'supabase_admin')
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not (old.auth_id is null and new.auth_id = auth.uid())
  then
    raise exception 'members.auth_id ne peut pas être modifié' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_members_protect_auth_id on public.members;
create trigger trg_members_protect_auth_id
  before update on public.members
  for each row execute function public.members_protect_auth_id();

alter table public.members enable row level security;

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated using (
  auth_id = auth.uid()
  or shares_org_with(id)
  or is_super_admin()
  or member_is_claimable(auth_id, email)
  or (is_any_org_admin() and member_is_unattached(id))
);

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated with check (
  auth_id is null and (is_any_org_admin() or is_super_admin())
);

drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated using (
  auth_id = auth.uid()
  or is_admin_of_member(id)
  or is_super_admin()
  or member_is_claimable(auth_id, email)
  or (is_any_org_admin() and member_is_unattached(id))
) with check (
  auth_id = auth.uid()
  or is_admin_of_member(id)
  or is_super_admin()
  or (is_any_org_admin() and member_is_unattached(id))
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated using (
  is_super_admin() or (is_any_org_admin() and member_is_unattached(id))
);

-- ── members_projects ──────────────────────────────────────────────────────────

-- Ces déclencheurs rattachent les administrateurs aux projets : ils doivent
-- pouvoir écrire quel que soit l'utilisateur qui crée le projet.
alter function public.fn_auto_assign_admin_to_projects() security definer set search_path = public;
alter function public.fn_auto_assign_admins_to_new_project() security definer set search_path = public;

alter table public.members_projects enable row level security;

drop policy if exists members_projects_select on public.members_projects;
create policy members_projects_select on public.members_projects for select to authenticated using (
  is_org_member(project_org_id(project_id)) or is_super_admin()
);

drop policy if exists members_projects_insert on public.members_projects;
create policy members_projects_insert on public.members_projects for insert to authenticated with check (
  is_org_admin(project_org_id(project_id)) or is_super_admin()
);

drop policy if exists members_projects_update on public.members_projects;
create policy members_projects_update on public.members_projects for update to authenticated using (
  is_org_admin(project_org_id(project_id)) or is_super_admin()
);

drop policy if exists members_projects_delete on public.members_projects;
create policy members_projects_delete on public.members_projects for delete to authenticated using (
  is_org_admin(project_org_id(project_id)) or is_super_admin()
);

-- ── report_templates ──────────────────────────────────────────────────────────

alter table public.report_templates enable row level security;

drop policy if exists report_templates_select on public.report_templates;
create policy report_templates_select on public.report_templates for select to authenticated using (
  is_org_member(organization_id) or is_super_admin()
);

drop policy if exists report_templates_insert on public.report_templates;
create policy report_templates_insert on public.report_templates for insert to authenticated with check (
  is_org_admin(organization_id) or is_super_admin()
);

drop policy if exists report_templates_update on public.report_templates;
create policy report_templates_update on public.report_templates for update to authenticated using (
  is_org_admin(organization_id) or is_super_admin()
);

drop policy if exists report_templates_delete on public.report_templates;
create policy report_templates_delete on public.report_templates for delete to authenticated using (
  is_org_admin(organization_id) or is_super_admin()
);

-- ── user_fcm_tokens ───────────────────────────────────────────────────────────
-- La policy « Users can manage their own tokens » (auth.uid() = user_id)
-- existait déjà mais n'était pas appliquée faute de RLS activée.

alter table public.user_fcm_tokens enable row level security;
