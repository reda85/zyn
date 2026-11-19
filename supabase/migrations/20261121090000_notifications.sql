-- Notifications (web et mobile) : centre de notifications par membre, rempli
-- par des déclencheurs, et envoyé en push par le backend.
--
-- Événements :
--   assigned   un élément (réserve, tâche, observation) m'est assigné
--   status     statut changé sur un élément que j'ai créé ou qui m'est assigné
--   comment    commentaire sur un de ces éléments
--   photo      photo ajoutée sur un de ces éléments (une par élément et par heure)
--   due_soon   un élément qui m'est assigné arrive à échéance demain
--   overdue    un élément qui m'est assigné vient de passer en retard
--   meeting    compte rendu de réunion diffusé (membres du projet)
--   document   document ajouté ou nouvelle version (membres du projet)
--   report     rapport généré (membres du projet)
-- L'auteur d'une action n'est jamais notifié de sa propre action.

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.members(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  kind          text not null check (kind in ('assigned', 'status', 'comment', 'photo', 'due_soon', 'overdue', 'meeting', 'document', 'report')),
  title         text not null,
  body          text,
  pin_id        uuid references public.pdf_pins(id) on delete cascade,
  target        jsonb not null default '{}'::jsonb,   -- { meetingId, documentId, reportId }
  actor_id      uuid references public.members(id) on delete set null,
  dedupe_key    text,
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  pushed_at     timestamptz
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
create index if not exists notifications_push_idx on public.notifications (created_at) where pushed_at is null;
create unique index if not exists notifications_dedupe_idx on public.notifications (recipient_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (recipient_id = public.current_member_id());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated using (recipient_id = public.current_member_id()) with check (recipient_id = public.current_member_id());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (recipient_id = public.current_member_id());

-- Lecture, suppression, et seulement « lu / non lu » en écriture.
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Nouvelles notifications en direct sur le web (filtrées par les RLS).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ── Outils ────────────────────────────────────────────────────────────────────
create or replace function public.notify_members(
  p_recipients uuid[], p_project uuid, p_kind text, p_title text, p_body text,
  p_pin uuid default null, p_target jsonb default '{}'::jsonb, p_actor uuid default null, p_dedupe text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (recipient_id, project_id, kind, title, body, pin_id, target, actor_id, dedupe_key)
  select distinct r, p_project, p_kind, left(p_title, 200), left(p_body, 500), p_pin, coalesce(p_target, '{}'::jsonb), p_actor, p_dedupe
  from unnest(p_recipients) as r
  where r is not null and r is distinct from p_actor
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

/** Membres actifs d'un projet. */
create or replace function public.project_member_ids(p_project uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct mp.member_id), '{}')
  from members_projects mp
  where mp.project_id = p_project and mp.member_id is not null and mp.active is not false
$$;

create or replace function public.pin_label(p_type text) returns text
language sql immutable as $$
  select case p_type when 'tache' then 'tâche' when 'observation' then 'observation' else 'réserve' end
$$;

/** « « Nom de l'élément » · Projet » pour le texte des notifications. */
create or replace function public.pin_ref(p_pin pdf_pins) returns text
language sql stable security definer set search_path = public as $$
  select '« ' || coalesce(nullif(btrim(p_pin.name), ''), 'Sans titre') || ' »'
    || coalesce(' · ' || (select name from projects where id = p_pin.project_id), '')
$$;

create or replace function public.member_name(p_member uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(btrim(name), '') from members where id = p_member), 'Un membre')
$$;

-- ── Éléments : assignation et statut ─────────────────────────────────────────
create or replace function public.notif_pdf_pins() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := coalesce(current_member_id(), new.updated_by, new.created_by);
  v_label text := pin_label(new.type);
  v_status text;
begin
  if new.deleted_at is not null or coalesce(new."isArchived", false) then
    return new;
  end if;

  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform notify_members(array[new.assigned_to], new.project_id, 'assigned',
      initcap(left(v_label, 1)) || substr(v_label, 2) || ' assignée',
      member_name(v_actor) || ' vous a assigné ' || pin_ref(new),
      new.id, '{}'::jsonb, v_actor);
  end if;

  if tg_op = 'UPDATE' and new.status_id is distinct from old.status_id and new.status_id is not null then
    select name into v_status from "Status" where id = new.status_id;
    perform notify_members(array[new.created_by, new.assigned_to], new.project_id, 'status',
      initcap(left(v_label, 1)) || substr(v_label, 2) || ' : ' || coalesce(v_status, 'statut modifié'),
      member_name(v_actor) || ' a changé le statut de ' || pin_ref(new),
      new.id, '{}'::jsonb, v_actor);
  end if;
  return new;
exception when others then
  -- Une notification ne doit jamais empêcher l'enregistrement.
  raise warning 'notif_pdf_pins: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_pdf_pins_notifications on public.pdf_pins;
create trigger trg_pdf_pins_notifications
  after insert or update of assigned_to, status_id on public.pdf_pins
  for each row execute function public.notif_pdf_pins();

-- ── Commentaires ─────────────────────────────────────────────────────────────
create or replace function public.notif_comments() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pin pdf_pins;
  v_actor uuid := coalesce(new.sender_id, current_member_id());
begin
  select * into v_pin from pdf_pins where id = new.pin_id;
  if v_pin.id is null or v_pin.deleted_at is not null then return new; end if;
  perform notify_members(array[v_pin.created_by, v_pin.assigned_to], v_pin.project_id, 'comment',
    'Commentaire de ' || member_name(v_actor),
    left(coalesce(new.comment, ''), 160) || ' — ' || pin_ref(v_pin),
    v_pin.id, '{}'::jsonb, v_actor);
  return new;
exception when others then
  raise warning 'notif_comments: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_comments_notifications on public.comments;
create trigger trg_comments_notifications
  after insert on public.comments
  for each row execute function public.notif_comments();

-- ── Photos ───────────────────────────────────────────────────────────────────
create or replace function public.notif_pins_photos() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pin pdf_pins;
  v_actor uuid := coalesce(new.sender_id, current_member_id());
begin
  if new.pin_id is null then return new; end if;
  select * into v_pin from pdf_pins where id = new.pin_id;
  -- Photos prises à la création de l'élément : l'assignation suffit.
  if v_pin.id is null or v_pin.deleted_at is not null or v_pin.created_at > now() - interval '10 minutes' then
    return new;
  end if;
  perform notify_members(array[v_pin.created_by, v_pin.assigned_to], v_pin.project_id, 'photo',
    'Nouvelle photo',
    member_name(v_actor) || ' a ajouté une photo sur ' || pin_ref(v_pin),
    v_pin.id, '{}'::jsonb, v_actor,
    'photo:' || v_pin.id || ':' || to_char(now() at time zone 'Africa/Casablanca', 'YYYYMMDDHH24'));
  return new;
exception when others then
  raise warning 'notif_pins_photos: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_pins_photos_notifications on public.pins_photos;
create trigger trg_pins_photos_notifications
  after insert on public.pins_photos
  for each row execute function public.notif_pins_photos();

-- ── Réunions : compte rendu diffusé ──────────────────────────────────────────
create or replace function public.notif_meetings() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := coalesce(current_member_id(), new.created_by);
begin
  if new.statut = 'diffusee' and old.statut is distinct from 'diffusee' then
    perform notify_members(project_member_ids(new.project_id), new.project_id, 'meeting',
      'Compte rendu n° ' || new.numero || ' diffusé',
      'Réunion du ' || to_char(new.date, 'DD/MM/YYYY') || coalesce(' · ' || (select name from projects where id = new.project_id), ''),
      null, jsonb_build_object('meetingId', new.id), v_actor,
      'meeting:' || new.id || ':' || to_char(now(), 'YYYYMMDDHH24MISS'));
  end if;
  return new;
exception when others then
  raise warning 'notif_meetings: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_meetings_notifications on public.meetings;
create trigger trg_meetings_notifications
  after update of statut on public.meetings
  for each row execute function public.notif_meetings();

-- ── Documents : ajout et nouvelle version ────────────────────────────────────
create or replace function public.notif_document_versions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_doc documents;
  v_actor uuid := coalesce((select id from members where auth_id = new.uploaded_by limit 1), current_member_id());
begin
  select * into v_doc from documents where id = new.document_id;
  if v_doc.id is null then return new; end if;
  perform notify_members(project_member_ids(v_doc.project_id), v_doc.project_id, 'document',
    case when coalesce(new.version_number, 1) <= 1 then 'Nouveau document' else 'Nouvelle version (v' || new.version_number || ')' end,
    v_doc.name || ' · ajouté par ' || member_name(v_actor) || coalesce(' · ' || (select name from projects where id = v_doc.project_id), ''),
    null, jsonb_build_object('documentId', v_doc.id), v_actor);
  return new;
exception when others then
  raise warning 'notif_document_versions: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_document_versions_notifications on public.document_versions;
create trigger trg_document_versions_notifications
  after insert on public.document_versions
  for each row execute function public.notif_document_versions();

-- ── Rapports générés ─────────────────────────────────────────────────────────
create or replace function public.notif_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_members(project_member_ids(new.project_id), new.project_id, 'report',
    'Nouveau rapport : ' || new.title,
    case new.kind when 'reserves' then 'Rapport de réserves' when 'visite' then 'Rapport de visite'
                  when 'avancement' then 'Rapport d''avancement' else 'Rapport' end
      || ' généré par ' || member_name(new.created_by)
      || coalesce(' · ' || (select name from projects where id = new.project_id), ''),
    null, jsonb_build_object('reportId', new.id), new.created_by);
  return new;
exception when others then
  raise warning 'notif_reports: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_reports_notifications on public.reports;
create trigger trg_reports_notifications
  after insert on public.reports
  for each row execute function public.notif_reports();

-- ── Échéances (appelé chaque heure par le backend) ───────────────────────────
-- À partir de 7 h (heure du Maroc) : « échéance demain » et « en retard »
-- (échéance passée depuis 1 à 3 jours, pour ne pas inonder avec les anciens
-- retards). Une seule notification par élément et par échéance.
create or replace function public.notify_due_items() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
  v_before integer;
  v_after integer;
begin
  if extract(hour from now() at time zone 'Africa/Casablanca') < 7 then
    return 0;
  end if;
  select count(*) into v_before from notifications where kind in ('due_soon', 'overdue');

  with open_pins as (
    select p.*, (p.due_date at time zone 'Africa/Casablanca')::date as due_day
    from pdf_pins p
    where p.deleted_at is null and not coalesce(p."isArchived", false)
      and p.assigned_to is not null and p.due_date is not null
      and coalesce(p.avancement, 0) < 100
      -- pas au dernier statut du projet
      and p.status_id is distinct from (
        select s.id from "Status" s where s.project_id = p.project_id order by s."order" desc nulls last limit 1
      )
  )
  insert into notifications (recipient_id, project_id, kind, title, body, pin_id, dedupe_key)
  select assigned_to, project_id,
         case when due_day = v_today + 1 then 'due_soon' else 'overdue' end,
         case when due_day = v_today + 1 then 'Échéance demain' else 'En retard depuis le ' || to_char(due_day, 'DD/MM') end,
         initcap(left(pin_label(type), 1)) || substr(pin_label(type), 2) || ' « ' || coalesce(nullif(btrim(name), ''), 'Sans titre') || ' »'
           || coalesce(' · ' || (select pr.name from projects pr where pr.id = open_pins.project_id), ''),
         id,
         case when due_day = v_today + 1 then 'due_soon:' else 'overdue:' end || id || ':' || due_day
  from open_pins
  where due_day = v_today + 1 or due_day between v_today - 3 and v_today - 1
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null do nothing;

  select count(*) into v_after from notifications where kind in ('due_soon', 'overdue');
  return v_after - v_before;
end $$;

-- ── Envoi en push (backend) ──────────────────────────────────────────────────
-- Réserve les notifications à envoyer (une seule instance les prend).
create or replace function public.claim_notification_pushes(p_limit integer default 200)
returns table (id uuid, auth_id uuid, kind text, title text, body text, pin_id uuid, project_id uuid, target jsonb)
language sql security definer set search_path = public as $$
  with c as (
    select n.id from notifications n
    where n.pushed_at is null and n.created_at > now() - interval '1 hour'
    order by n.created_at
    limit p_limit
    for update skip locked
  )
  update notifications n set pushed_at = now()
  from c, members m
  where n.id = c.id and m.id = n.recipient_id
  returning n.id, m.auth_id, n.kind, n.title, n.body, n.pin_id, n.project_id, n.target
$$;

-- Ces fonctions ne servent qu'aux déclencheurs et au backend (clé service).
revoke all on function public.notify_members(uuid[], uuid, text, text, text, uuid, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.project_member_ids(uuid) from public, anon, authenticated;
revoke all on function public.notify_due_items() from public, anon, authenticated;
revoke all on function public.claim_notification_pushes(integer) from public, anon, authenticated;
revoke all on function public.pin_ref(pdf_pins) from public, anon, authenticated;
revoke all on function public.member_name(uuid) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.notify_due_items() to service_role;
    grant execute on function public.claim_notification_pushes(integer) to service_role;
  end if;
end $$;
