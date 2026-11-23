-- Sous-lots du planning : un lot (Électricité) se découpe en sous-lots
-- (Courant fort, Courant faible) qui regroupent ses tâches. Les dates et
-- l'avancement d'un sous-lot se déduisent de ses tâches.

create table if not exists public.sous_lots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  lot_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sous_lots_lot on public.sous_lots (lot_id, sort_order);
create index if not exists idx_sous_lots_project on public.sous_lots (project_id);

-- Le sous-lot appartient à un lot du même projet.
create or replace function public.sous_lots_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from categories where id = new.lot_id and project_id = new.project_id) then
    raise exception 'Le lot n''appartient pas à ce projet';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sous_lots_check on public.sous_lots;
create trigger sous_lots_check
  before insert or update on public.sous_lots
  for each row execute function public.sous_lots_check();

alter table public.sous_lots enable row level security;

drop policy if exists sous_lots_select on public.sous_lots;
create policy sous_lots_select on public.sous_lots for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists sous_lots_insert on public.sous_lots;
create policy sous_lots_insert on public.sous_lots for insert to authenticated
  with check (public.can_edit_project(project_id));

drop policy if exists sous_lots_update on public.sous_lots;
create policy sous_lots_update on public.sous_lots for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists sous_lots_delete on public.sous_lots;
create policy sous_lots_delete on public.sous_lots for delete to authenticated
  using (public.can_edit_project(project_id));

revoke all on public.sous_lots from anon;
revoke truncate, references, trigger on public.sous_lots from authenticated;
grant select, insert, update, delete on public.sous_lots to authenticated;

-- ── Rattachement des tâches ───────────────────────────────────────────────────

alter table public.pdf_pins
  add column if not exists sous_lot_id uuid references public.sous_lots(id) on delete set null;

create index if not exists idx_pdf_pins_sous_lot on public.pdf_pins (sous_lot_id) where sous_lot_id is not null;

-- Une tâche qui change de lot quitte son sous-lot ; un sous-lot d'un autre
-- lot est refusé.
create or replace function public.pdf_pins_sous_lot_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sous_lot_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.category_id is distinct from old.category_id
     and new.sous_lot_id is not distinct from old.sous_lot_id then
    new.sous_lot_id := null;
    return new;
  end if;
  if not exists (select 1 from sous_lots where id = new.sous_lot_id and lot_id = new.category_id) then
    raise exception 'Le sous-lot n''appartient pas au lot de la tâche';
  end if;
  return new;
end;
$$;

drop trigger if exists pdf_pins_sous_lot_check on public.pdf_pins;
create trigger pdf_pins_sous_lot_check
  before insert or update of sous_lot_id, category_id on public.pdf_pins
  for each row execute function public.pdf_pins_sous_lot_check();
