-- Index de support pour les listes paginées et les contrôles RLS.
-- Additif uniquement (aucune donnée ni colonne modifiée) ; réversible par DROP INDEX.

-- Liste des tâches : filtre projet + pagination par curseur (created_at, id).
create index if not exists idx_pdf_pins_project_created
  on public.pdf_pins (project_id, created_at desc, id desc)
  where deleted_at is null;

-- Vue plan : tous les pins d'un plan.
create index if not exists idx_pdf_pins_plan
  on public.pdf_pins (plan_id)
  where deleted_at is null;

-- Tâches d'un invité (filtre assigned_to).
create index if not exists idx_pdf_pins_assigned_to
  on public.pdf_pins (assigned_to)
  where deleted_at is null;

-- Médiathèque : filtre projet + pagination par curseur.
create index if not exists idx_pins_photos_project_created
  on public.pins_photos (project_id, created_at desc, id desc)
  where deleted_at is null;

-- Photos d'un pin (jointures, rapports).
create index if not exists idx_pins_photos_pin
  on public.pins_photos (pin_id);

-- Timeline d'un pin.
create index if not exists idx_events_pin_created
  on public.events (pin_id, created_at);

create index if not exists idx_comments_pin_created
  on public.comments (pin_id, created_at);

-- Filtre par tag (pin_tags a déjà (pin_id, tag_id)).
create index if not exists idx_pin_tags_tag
  on public.pin_tags (tag_id);

-- Chat : derniers messages d'un groupe, puis remontée dans l'historique.
create index if not exists idx_disc_messages_group_created
  on public.discussions_messages (group_id, created_at desc);

-- Contrôles RLS (is_org_member / is_org_admin / is_super_admin) : exécutés à chaque ligne lue.
create index if not exists idx_members_organizations_member_org
  on public.members_organizations (member_id, organization_id);

create index if not exists idx_members_projects_member
  on public.members_projects (member_id);

create index if not exists idx_members_projects_project
  on public.members_projects (project_id);

-- Listes par projet / organisation.
create index if not exists idx_projects_organization
  on public.projects (organization_id);

create index if not exists idx_categories_project
  on public.categories (project_id);

create index if not exists idx_status_project
  on public."Status" (project_id);

create index if not exists idx_tags_project
  on public.tags (project_id);
