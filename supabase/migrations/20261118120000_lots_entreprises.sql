-- Lots et entreprises : première étape du pilotage de chantier.
--
-- Les « catégories » d'un projet deviennent ses lots. On garde la table
-- `categories` (et donc tous les liens pdf_pins.category_id existants) et on
-- lui ajoute ce qui fait un lot : l'entreprise titulaire, les dates et
-- l'avancement. Les entreprises sont tenues au niveau de l'organisation, pour
-- être réutilisées d'un projet à l'autre ; la plupart n'ont pas de compte.

-- ── Entreprises ───────────────────────────────────────────────────────────────

create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  corps_etat text,          -- spécialité habituelle : « Gros œuvre », « Électricité »…
  contact_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entreprises_org on public.entreprises (organization_id, name);

drop trigger if exists entreprises_updated_at on public.entreprises;
create trigger entreprises_updated_at
  before update on public.entreprises
  for each row execute function public.update_updated_at_column();

alter table public.entreprises enable row level security;

-- Annuaire partagé de l'organisation : tout membre le lit et l'enrichit,
-- seuls les administrateurs suppriment.
drop policy if exists entreprises_select on public.entreprises;
create policy entreprises_select on public.entreprises for select to authenticated
  using (is_org_member(organization_id) or is_super_admin());

drop policy if exists entreprises_insert on public.entreprises;
create policy entreprises_insert on public.entreprises for insert to authenticated
  with check (is_org_member(organization_id) or is_super_admin());

drop policy if exists entreprises_update on public.entreprises;
create policy entreprises_update on public.entreprises for update to authenticated
  using (is_org_member(organization_id) or is_super_admin())
  with check (is_org_member(organization_id) or is_super_admin());

drop policy if exists entreprises_delete on public.entreprises;
create policy entreprises_delete on public.entreprises for delete to authenticated
  using (is_org_admin(organization_id) or is_super_admin());

-- ── Lots (table categories) ───────────────────────────────────────────────────

alter table public.categories
  add column if not exists entreprise_id uuid references public.entreprises(id) on delete set null,
  add column if not exists date_debut_prevue date,
  add column if not exists date_fin_prevue date,
  add column if not exists date_debut_reelle date,
  add column if not exists date_fin_reelle date,
  add column if not exists avancement smallint not null default 0;

alter table public.categories drop constraint if exists categories_avancement_check;
alter table public.categories
  add constraint categories_avancement_check check (avancement between 0 and 100);

alter table public.categories drop constraint if exists categories_dates_prevues_check;
alter table public.categories
  add constraint categories_dates_prevues_check
  check (date_debut_prevue is null or date_fin_prevue is null or date_fin_prevue >= date_debut_prevue);

alter table public.categories drop constraint if exists categories_dates_reelles_check;
alter table public.categories
  add constraint categories_dates_reelles_check
  check (date_debut_reelle is null or date_fin_reelle is null or date_fin_reelle >= date_debut_reelle);

create index if not exists idx_categories_entreprise on public.categories (entreprise_id);

-- Un lot ne peut être confié qu'à une entreprise de l'organisation du projet.
create or replace function public.check_lot_entreprise()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entreprise_id is not null and not exists (
    select 1 from entreprises e
    where e.id = new.entreprise_id
      and e.organization_id = project_org_id(new.project_id)
  ) then
    raise exception 'Entreprise hors de l''organisation du projet' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_lot_entreprise() from public, anon, authenticated;

drop trigger if exists categories_check_entreprise on public.categories;
create trigger categories_check_entreprise
  before insert or update of entreprise_id, project_id on public.categories
  for each row execute function public.check_lot_entreprise();
