-- Type de rapport porté par chaque modèle : réserves, visite de chantier,
-- avancement, ou libre (tous éléments, comportement d'avant). Les modèles
-- existants restent « libre » et servent pour tous les types.
alter table public.report_templates
  add column if not exists kind text not null default 'libre';

alter table public.report_templates drop constraint if exists report_templates_kind_check;
alter table public.report_templates
  add constraint report_templates_kind_check check (kind in ('libre', 'reserves', 'visite', 'avancement'));
