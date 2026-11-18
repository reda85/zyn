-- Réunions de chantier : deuxième étape du pilotage.
--
-- Une réunion (numérotée par projet) réunit :
--   · les présents, par entreprise ou membre (instantané du nom à la date) ;
--   · l'avancement de chaque lot constaté ce jour-là ;
--   · les points à suivre. Un point vit au niveau du projet : créé lors d'une
--     réunion, il est repris à chaque réunion suivante tant qu'il est ouvert,
--     avec un commentaire de suivi par réunion, jusqu'à ce qu'une réunion le solde.
-- Une réunion « diffusée » est figée ; la diffusion reporte l'avancement
-- constaté sur les lots. Une seule réunion en brouillon par projet.

-- ── Réunions ──────────────────────────────────────────────────────────────────

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  numero integer not null,
  date date not null default current_date,
  heure text,
  lieu text,
  objet text not null default 'Réunion de chantier',
  observations text,
  prochaine_date date,
  prochaine_heure text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'diffusee')),
  diffusee_at timestamptz,
  created_by uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, numero)
);

create unique index if not exists meetings_one_draft_per_project
  on public.meetings (project_id) where statut = 'brouillon';

create table if not exists public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  entreprise_id uuid references public.entreprises(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  nom text,                         -- personne présente
  societe text,                     -- instantané du nom de l'entreprise
  presence text not null default 'present' check (presence in ('present', 'absent', 'excuse')),
  ordre smallint not null default 0,
  check (coalesce(nom, societe) is not null)
);
create index if not exists idx_meeting_attendees_meeting on public.meeting_attendees (meeting_id, ordre);

create table if not exists public.meeting_lot_progress (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  lot_id uuid not null references public.categories(id) on delete cascade,
  avancement smallint not null default 0 check (avancement between 0 and 100),
  commentaire text,
  primary key (meeting_id, lot_id)
);

-- ── Points à suivre ───────────────────────────────────────────────────────────

create table if not exists public.meeting_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  numero integer not null,
  meeting_id uuid not null references public.meetings(id) on delete cascade,      -- réunion d'ouverture
  clos_meeting_id uuid references public.meetings(id) on delete set null,          -- réunion qui l'a soldé
  lot_id uuid references public.categories(id) on delete set null,
  entreprise_id uuid references public.entreprises(id) on delete set null,         -- responsable
  type text not null default 'action' check (type in ('action', 'decision', 'information')),
  texte text not null check (length(trim(texte)) > 0),
  echeance date,
  statut text not null default 'ouvert' check (statut in ('ouvert', 'clos')),
  created_by uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, numero),
  check ((statut = 'clos') = (clos_meeting_id is not null))
);
create index if not exists idx_meeting_points_project on public.meeting_points (project_id, statut);
create index if not exists idx_meeting_points_meeting on public.meeting_points (meeting_id);
create index if not exists idx_meeting_points_clos on public.meeting_points (clos_meeting_id);

create table if not exists public.meeting_point_suivis (
  point_id uuid not null references public.meeting_points(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  texte text not null,
  updated_at timestamptz not null default now(),
  primary key (point_id, meeting_id)
);

-- ── Numérotation et horodatage ────────────────────────────────────────────────

create or replace function public.set_meeting_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('meetings:' || new.project_id::text));
  select coalesce(max(numero), 0) + 1 into new.numero from meetings where project_id = new.project_id;
  return new;
end;
$$;

create or replace function public.set_meeting_point_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('meeting_points:' || new.project_id::text));
  select coalesce(max(numero), 0) + 1 into new.numero from meeting_points where project_id = new.project_id;
  return new;
end;
$$;

revoke execute on function public.set_meeting_numero() from public, anon, authenticated;
revoke execute on function public.set_meeting_point_numero() from public, anon, authenticated;

drop trigger if exists meetings_numero on public.meetings;
create trigger meetings_numero before insert on public.meetings
  for each row execute function public.set_meeting_numero();

drop trigger if exists meeting_points_numero on public.meeting_points;
create trigger meeting_points_numero before insert on public.meeting_points
  for each row execute function public.set_meeting_point_numero();

drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.update_updated_at_column();

drop trigger if exists meeting_points_updated_at on public.meeting_points;
create trigger meeting_points_updated_at before update on public.meeting_points
  for each row execute function public.update_updated_at_column();

drop trigger if exists meeting_point_suivis_updated_at on public.meeting_point_suivis;
create trigger meeting_point_suivis_updated_at before update on public.meeting_point_suivis
  for each row execute function public.update_updated_at_column();

-- Supprimer un brouillon rouvre les points qu'il avait soldés.
create or replace function public.reopen_points_of_deleted_meeting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Suppression en cascade du projet : les points partent aussi, rien à rouvrir.
  if not exists (select 1 from projects where id = old.project_id) then
    return old;
  end if;
  update meeting_points set statut = 'ouvert', clos_meeting_id = null where clos_meeting_id = old.id;
  return old;
end;
$$;
revoke execute on function public.reopen_points_of_deleted_meeting() from public, anon, authenticated;

drop trigger if exists meetings_reopen_points on public.meetings;
create trigger meetings_reopen_points before delete on public.meetings
  for each row execute function public.reopen_points_of_deleted_meeting();

-- ── Droits ────────────────────────────────────────────────────────────────────

-- Réunion modifiable : brouillon, sur un projet que l'utilisateur peut éditer.
create or replace function public.meeting_editable(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from meetings m
    where m.id = mid and m.statut = 'brouillon' and can_edit_project(m.project_id)
  )
$$;

create or replace function public.meeting_readable(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from meetings m where m.id = mid and can_access_project(m.project_id))
$$;

revoke execute on function public.meeting_editable(uuid) from public, anon;
revoke execute on function public.meeting_readable(uuid) from public, anon;
grant execute on function public.meeting_editable(uuid) to authenticated;
grant execute on function public.meeting_readable(uuid) to authenticated;

alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.meeting_lot_progress enable row level security;
alter table public.meeting_points enable row level security;
alter table public.meeting_point_suivis enable row level security;

-- meetings : la diffusion passe par diffuser_reunion(), jamais par un update direct.
drop policy if exists meetings_select on public.meetings;
create policy meetings_select on public.meetings for select to authenticated
  using (can_access_project(project_id));
drop policy if exists meetings_insert on public.meetings;
create policy meetings_insert on public.meetings for insert to authenticated
  with check (can_edit_project(project_id) and statut = 'brouillon');
drop policy if exists meetings_update on public.meetings;
create policy meetings_update on public.meetings for update to authenticated
  using (can_edit_project(project_id) and statut = 'brouillon')
  with check (can_edit_project(project_id) and statut = 'brouillon');
drop policy if exists meetings_delete on public.meetings;
create policy meetings_delete on public.meetings for delete to authenticated
  using (can_edit_project(project_id) and statut = 'brouillon');

-- Présents, avancement et suivis : lisibles avec la réunion, modifiables en brouillon.
do $$
declare t text;
begin
  foreach t in array array['meeting_attendees', 'meeting_lot_progress', 'meeting_point_suivis'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (meeting_readable(meeting_id))', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (meeting_editable(meeting_id))', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (meeting_editable(meeting_id)) with check (meeting_editable(meeting_id))', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (meeting_editable(meeting_id))', t);
  end loop;
end $$;

-- Points : créés et soldés pendant un brouillon ; libellé, responsable et
-- échéance restent modifiables par les éditeurs du projet.
drop policy if exists meeting_points_select on public.meeting_points;
create policy meeting_points_select on public.meeting_points for select to authenticated
  using (can_access_project(project_id));
drop policy if exists meeting_points_insert on public.meeting_points;
create policy meeting_points_insert on public.meeting_points for insert to authenticated
  with check (can_edit_project(project_id) and meeting_editable(meeting_id) and statut = 'ouvert');
drop policy if exists meeting_points_update on public.meeting_points;
create policy meeting_points_update on public.meeting_points for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id) and (clos_meeting_id is null or meeting_editable(clos_meeting_id)));
drop policy if exists meeting_points_delete on public.meeting_points;
create policy meeting_points_delete on public.meeting_points for delete to authenticated
  using (can_edit_project(project_id) and meeting_editable(meeting_id));

-- Un point ne peut être rattaché qu'à un lot et une réunion de son projet.
create or replace function public.check_meeting_point_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from meetings where id = new.meeting_id and project_id = new.project_id)
     or (new.clos_meeting_id is not null and not exists (select 1 from meetings where id = new.clos_meeting_id and project_id = new.project_id))
     or (new.lot_id is not null and not exists (select 1 from categories where id = new.lot_id and project_id = new.project_id))
     or (new.entreprise_id is not null and not exists (select 1 from entreprises where id = new.entreprise_id and organization_id = project_org_id(new.project_id)))
  then
    raise exception 'Point de réunion rattaché à un autre projet' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_meeting_point_refs() from public, anon, authenticated;

drop trigger if exists meeting_points_check_refs on public.meeting_points;
create trigger meeting_points_check_refs before insert or update on public.meeting_points
  for each row execute function public.check_meeting_point_refs();

create or replace function public.check_meeting_lot_progress_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from meetings m join categories c on c.project_id = m.project_id
    where m.id = new.meeting_id and c.id = new.lot_id
  ) then
    raise exception 'Lot hors du projet de la réunion' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_meeting_lot_progress_refs() from public, anon, authenticated;

drop trigger if exists meeting_lot_progress_check_refs on public.meeting_lot_progress;
create trigger meeting_lot_progress_check_refs before insert or update on public.meeting_lot_progress
  for each row execute function public.check_meeting_lot_progress_refs();

-- ── Créer une réunion ─────────────────────────────────────────────────────────
-- Pré-remplit les présents (ceux de la réunion précédente, sinon les
-- entreprises titulaires des lots) et l'avancement actuel des lots.
create or replace function public.creer_reunion(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_prev meetings%rowtype;
begin
  if not can_edit_project(p_project_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if exists (select 1 from meetings where project_id = p_project_id and statut = 'brouillon') then
    raise exception 'Une réunion est déjà en cours de rédaction' using errcode = '23505';
  end if;

  select * into v_prev from meetings
  where project_id = p_project_id order by numero desc limit 1;

  -- Date et heure : celles annoncées au compte rendu précédent, si elles ne sont pas passées.
  insert into meetings (project_id, numero, date, heure, lieu, created_by)
  values (
    p_project_id, 0,
    case when v_prev.prochaine_date >= current_date then v_prev.prochaine_date else current_date end,
    coalesce(v_prev.prochaine_heure, v_prev.heure),
    coalesce(v_prev.lieu, 'Sur site'),
    current_member_id()
  )
  returning id into v_id;

  if v_prev.id is not null then
    insert into meeting_attendees (meeting_id, entreprise_id, member_id, nom, societe, presence, ordre)
    select v_id, a.entreprise_id, a.member_id, a.nom, coalesce(e.name, a.societe), 'present', a.ordre
    from meeting_attendees a left join entreprises e on e.id = a.entreprise_id
    where a.meeting_id = v_prev.id;
  else
    insert into meeting_attendees (meeting_id, entreprise_id, societe, nom, presence, ordre)
    select v_id, e.id, e.name, e.contact_name, 'present', (row_number() over (order by min(c."order")))::smallint
    from categories c join entreprises e on e.id = c.entreprise_id
    where c.project_id = p_project_id
    group by e.id, e.name, e.contact_name;
  end if;

  insert into meeting_lot_progress (meeting_id, lot_id, avancement)
  select v_id, c.id, c.avancement
  from categories c
  where c.project_id = p_project_id and coalesce(c.icon, '') <> 'unassigned';

  return v_id;
end;
$$;

-- ── Diffuser une réunion ──────────────────────────────────────────────────────
-- Fige la réunion et reporte l'avancement constaté sur les lots (avec le début
-- réel au premier avancement et la fin réelle à 100 %).
create or replace function public.diffuser_reunion(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m meetings%rowtype;
begin
  select * into m from meetings where id = p_meeting_id for update;
  if not found or not can_edit_project(m.project_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if m.statut <> 'brouillon' then
    raise exception 'Réunion déjà diffusée' using errcode = '23514';
  end if;

  update meetings set statut = 'diffusee', diffusee_at = now() where id = p_meeting_id;

  update categories c set
    avancement = p.avancement,
    date_debut_reelle = case when p.avancement > 0 then coalesce(c.date_debut_reelle, m.date) else c.date_debut_reelle end,
    date_fin_reelle = case when p.avancement = 100 then coalesce(c.date_fin_reelle, m.date) else c.date_fin_reelle end
  from meeting_lot_progress p
  where p.meeting_id = p_meeting_id and c.id = p.lot_id;
end;
$$;

-- Repasser la dernière réunion en brouillon (administrateurs), pour corriger.
create or replace function public.rouvrir_reunion(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m meetings%rowtype;
begin
  select * into m from meetings where id = p_meeting_id for update;
  if not found or not (is_org_admin(project_org_id(m.project_id)) or is_super_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if m.statut <> 'diffusee'
     or exists (select 1 from meetings where project_id = m.project_id and numero > m.numero) then
    raise exception 'Seule la dernière réunion diffusée peut être rouverte' using errcode = '23514';
  end if;
  update meetings set statut = 'brouillon', diffusee_at = null where id = p_meeting_id;
end;
$$;

revoke execute on function public.creer_reunion(uuid) from public, anon;
revoke execute on function public.diffuser_reunion(uuid) from public, anon;
revoke execute on function public.rouvrir_reunion(uuid) from public, anon;
grant execute on function public.creer_reunion(uuid) to authenticated;
grant execute on function public.diffuser_reunion(uuid) to authenticated;
grant execute on function public.rouvrir_reunion(uuid) to authenticated;
