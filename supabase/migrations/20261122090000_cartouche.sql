-- Cartouche des rapports : intervenants du projet, identité et visa des
-- rapports.
--
-- Les intervenants (maître d'ouvrage, maître d'œuvre, BET, OPC…) sont tenus
-- par projet et apparaissent dans le cartouche avec leur logo. Chaque rapport
-- reçoit un numéro d'ordre par projet et par type (calculé par le backend),
-- un numéro de document affiché, un indice, une phase et son visa.

-- ── Intervenants ──────────────────────────────────────────────────────────────

create table if not exists public.project_parties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (length(trim(role)) > 0),   -- « Maître d'ouvrage »…
  name text not null check (length(trim(name)) > 0),
  detail text,                                          -- représentant, adresse, contact
  logo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_parties_project on public.project_parties (project_id, sort_order);

drop trigger if exists project_parties_updated_at on public.project_parties;
create trigger project_parties_updated_at
  before update on public.project_parties
  for each row execute function public.update_updated_at_column();

alter table public.project_parties enable row level security;

drop policy if exists project_parties_select on public.project_parties;
create policy project_parties_select on public.project_parties for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists project_parties_insert on public.project_parties;
create policy project_parties_insert on public.project_parties for insert to authenticated
  with check (public.can_edit_project(project_id));

drop policy if exists project_parties_update on public.project_parties;
create policy project_parties_update on public.project_parties for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists project_parties_delete on public.project_parties;
create policy project_parties_delete on public.project_parties for delete to authenticated
  using (public.can_edit_project(project_id));

revoke all on public.project_parties from anon;
revoke truncate, references, trigger on public.project_parties from authenticated;
grant select, insert, update, delete on public.project_parties to authenticated;

-- ── Identité et visa des rapports ─────────────────────────────────────────────

alter table public.reports
  add column if not exists seq integer,            -- n° d'ordre par projet et par type
  add column if not exists doc_number text,        -- n° affiché (« RR-012 »)
  add column if not exists revision text,          -- indice (« A », « B »…)
  add column if not exists phase text,             -- EXE, OPR, GPA…
  add column if not exists visa jsonb;             -- { redige, verifie, approuve } (noms)

create index if not exists reports_project_kind_seq_idx on public.reports (project_id, kind, seq);

-- Prochain n° d'ordre d'un type de rapport, pour le proposer à la génération.
create or replace function public.next_report_seq(p_project_id uuid, p_kind text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when public.can_access_project(p_project_id)
    then coalesce((select max(seq) from public.reports where project_id = p_project_id and kind = p_kind), 0) + 1
  end;
$$;

revoke all on function public.next_report_seq(uuid, text) from public, anon;
grant execute on function public.next_report_seq(uuid, text) to authenticated;
