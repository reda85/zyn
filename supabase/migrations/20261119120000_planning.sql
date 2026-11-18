-- Planning de chantier : troisième étape du pilotage.
--
-- Chaque lot porte déjà ses dates prévues et réelles (table categories).
-- On y ajoute le détail : des tâches (une durée) et des jalons (une date),
-- rattachés à un lot ou au projet, avec leur avancement.

create table if not exists public.planning_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  lot_id uuid references public.categories(id) on delete cascade,
  libelle text not null check (length(trim(libelle)) > 0),
  type text not null default 'tache' check (type in ('tache', 'jalon')),
  date_debut date not null,
  date_fin date not null,
  avancement smallint not null default 0 check (avancement between 0 and 100),
  ordre integer not null default 0,
  created_by uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_fin >= date_debut),
  check (type = 'tache' or date_fin = date_debut)
);

create index if not exists idx_planning_tasks_project on public.planning_tasks (project_id, lot_id, ordre);

drop trigger if exists planning_tasks_updated_at on public.planning_tasks;
create trigger planning_tasks_updated_at before update on public.planning_tasks
  for each row execute function public.update_updated_at_column();

-- Le lot d'une tâche doit appartenir au même projet.
create or replace function public.check_planning_task_lot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lot_id is not null and not exists (
    select 1 from categories where id = new.lot_id and project_id = new.project_id
  ) then
    raise exception 'Lot hors du projet de la tâche' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_planning_task_lot() from public, anon, authenticated;

drop trigger if exists planning_tasks_check_lot on public.planning_tasks;
create trigger planning_tasks_check_lot before insert or update of lot_id, project_id on public.planning_tasks
  for each row execute function public.check_planning_task_lot();

alter table public.planning_tasks enable row level security;

drop policy if exists planning_tasks_select on public.planning_tasks;
create policy planning_tasks_select on public.planning_tasks for select to authenticated
  using (can_access_project(project_id));
drop policy if exists planning_tasks_insert on public.planning_tasks;
create policy planning_tasks_insert on public.planning_tasks for insert to authenticated
  with check (can_edit_project(project_id));
drop policy if exists planning_tasks_update on public.planning_tasks;
create policy planning_tasks_update on public.planning_tasks for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));
drop policy if exists planning_tasks_delete on public.planning_tasks;
create policy planning_tasks_delete on public.planning_tasks for delete to authenticated
  using (can_edit_project(project_id));

-- Dates prévues d'un lot depuis le planning : réservé jusqu'ici aux
-- administrateurs (RLS de categories) ; les éditeurs du projet planifient aussi.
create or replace function public.planifier_lot(p_lot_id uuid, p_debut date, p_fin date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  select project_id into v_project from categories where id = p_lot_id;
  if v_project is null or not can_edit_project(v_project) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_debut is not null and p_fin is not null and p_fin < p_debut then
    raise exception 'La fin précède le début' using errcode = '23514';
  end if;
  update categories set date_debut_prevue = p_debut, date_fin_prevue = p_fin where id = p_lot_id;
end;
$$;

revoke execute on function public.planifier_lot(uuid, date, date) from public, anon;
grant execute on function public.planifier_lot(uuid, date, date) to authenticated;
