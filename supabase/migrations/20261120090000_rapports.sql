-- Historique des rapports générés par projet. Le backend enregistre une ligne
-- à chaque génération (clé service) ; les membres du projet la lisent, ceux
-- qui peuvent modifier le projet la suppriment (le fichier est retiré du
-- stockage par le backend).
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  kind          text not null default 'libre'
                check (kind in ('libre', 'reserves', 'visite', 'avancement')),
  title         text not null,
  storage_path  text not null,
  file_name     text not null,
  file_size     bigint,
  item_count    integer not null default 0,
  period_start  date,
  period_end    date,
  template_id   uuid references public.report_templates(id) on delete set null,
  created_by    uuid references public.members(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint reports_period_check check (period_start is null or period_end is null or period_start <= period_end)
);

create index if not exists reports_project_created_idx on public.reports (project_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated using (public.can_access_project(project_id));

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports
  for delete to authenticated using (public.can_edit_project(project_id));

revoke all on public.reports from anon;
grant select, delete on public.reports to authenticated;
