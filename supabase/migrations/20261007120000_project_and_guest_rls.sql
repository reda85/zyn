-- Droits par projet et par rôle appliqués dans la base (et plus seulement dans les écrans).
--
-- Avant : toute personne de l'organisation lisait et modifiait tous les projets,
-- un invité pouvait tout lire et tout modifier en appelant l'API directement,
-- et tout compte connecté pouvait déposer des fichiers dans n'importe quel dossier.
--
-- Après :
--   * admin de l'organisation : tous les projets de l'organisation ;
--   * membre                 : uniquement les projets où il est ajouté (members_projects) ;
--   * invité                 : uniquement les pins qui lui sont assignés, dans ses projets ;
--                              il peut en changer le statut, commenter et ajouter des photos ;
--   * fichiers               : dépôt limité au dossier du projet / de l'organisation concerné.
--
-- Le backend (clé service) n'est pas concerné par ces règles.
-- Le script peut être rejoué sans risque.

begin;

-- ---------------------------------------------------------------------------
-- 1. Fonctions d'aide
-- ---------------------------------------------------------------------------

-- Rôles qui peuvent modifier. Tout autre rôle (invité, rôle vide ou inconnu)
-- est traité comme un invité : dans le doute, le moins de droits possible.
-- Invité dans cette organisation (et aucun rôle qui modifie).
create or replace function public.is_org_guest(org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
           select 1 from members_organizations mo
           where mo.organization_id = org_id and mo.member_id = current_member_id()
         )
     and not exists (
           select 1 from members_organizations mo
           where mo.organization_id = org_id and mo.member_id = current_member_id()
             and mo.role in ('admin', 'owner', 'Membres')
         )
$$;

-- Projets que l'utilisateur peut ouvrir.
create or replace function public.my_project_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select p.id
  from projects p
  where is_super_admin()
     or exists (
          select 1 from members_organizations mo
          where mo.organization_id = p.organization_id
            and mo.member_id = current_member_id()
            and mo.role in ('admin', 'owner')
        )
     or (
          exists (
            select 1 from members_organizations mo
            where mo.organization_id = p.organization_id and mo.member_id = current_member_id()
          )
          and exists (
            select 1 from members_projects mp
            where mp.project_id = p.id and mp.member_id = current_member_id()
          )
        )
$$;

-- Projets où l'utilisateur peut tout voir et modifier (admin ou membre, pas invité).
create or replace function public.my_editable_project_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select p.id
  from projects p
  where is_super_admin()
     or exists (
          select 1 from members_organizations mo
          where mo.organization_id = p.organization_id
            and mo.member_id = current_member_id()
            and mo.role in ('admin', 'owner')
        )
     or (
          exists (
            select 1 from members_organizations mo
            where mo.organization_id = p.organization_id
              and mo.member_id = current_member_id()
              and mo.role in ('admin', 'owner', 'Membres')
          )
          and exists (
            select 1 from members_projects mp
            where mp.project_id = p.id and mp.member_id = current_member_id()
          )
        )
$$;

create or replace function public.can_access_project(proj_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select proj_id is not null and exists (select 1 from my_project_ids() i where i = proj_id)
$$;

create or replace function public.can_edit_project(proj_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select proj_id is not null and exists (select 1 from my_editable_project_ids() i where i = proj_id)
$$;

create or replace function public.document_project_id(doc_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select d.project_id from documents d where d.id = doc_id
$$;

-- Conversion sans erreur : un chemin inattendu donne NULL, donc aucun accès.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql immutable set search_path = public
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

-- documents/<utilisateur>/<document>/<fichier>
create or replace function public.storage_document_project_id(object_name text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select document_project_id(safe_uuid((string_to_array(object_name, '/'))[2]))
$$;

-- discussions/<utilisateur>/<message>/<fichier> : lisible par les participants de la conversation.
create or replace function public.storage_discussion_can_read(object_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from discussions_messages m
    where m.id = safe_uuid((string_to_array(object_name, '/'))[2])
      and is_discussion_member(m.group_id, auth.uid())
  )
$$;

-- Participer à une conversation suppose d'avoir encore accès à son projet : une
-- personne retirée du projet ou de l'organisation ne lit plus les messages.
-- (Pour un autre utilisateur que soi, seule l'inscription est regardée.)
create or replace function public.is_discussion_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from discussions_members dm
    join discussions_groups g on g.id = dm.group_id
    where dm.group_id = p_group_id
      and dm.user_id = p_user_id
      and (p_user_id is distinct from auth.uid() or g.project_id is null or can_access_project(g.project_id))
  )
$$;

create or replace function public.is_discussion_admin(p_group_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from discussions_members dm
    join discussions_groups g on g.id = dm.group_id
    where dm.group_id = p_group_id
      and dm.user_id = p_user_id
      and dm.role = 'admin'
      and (p_user_id is distinct from auth.uid() or g.project_id is null or can_access_project(g.project_id))
  )
$$;

-- La personne ajoutée à une conversation doit avoir accès au projet de cette conversation.
create or replace function public.discussion_user_can_join(p_group_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from discussions_groups g
    join projects p on p.id = g.project_id
    join members m on m.auth_id = p_user_id
    where g.id = p_group_id
      and (
        exists (select 1 from members_projects mp where mp.project_id = p.id and mp.member_id = m.id)
        or exists (
          select 1 from members_organizations mo
          where mo.organization_id = p.organization_id and mo.member_id = m.id
            and mo.role in ('admin', 'owner')
        )
      )
  )
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'is_org_guest(uuid)', 'my_project_ids()', 'my_editable_project_ids()',
    'can_access_project(uuid)', 'can_edit_project(uuid)', 'document_project_id(uuid)',
    'safe_uuid(text)', 'storage_document_project_id(text)', 'storage_discussion_can_read(text)',
    'discussion_user_can_join(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated, service_role', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Numérotation et création de projet
-- ---------------------------------------------------------------------------

-- Ces compteurs doivent avancer même si l'utilisateur n'a pas le droit de modifier
-- la fiche du projet ou de l'organisation.
alter function public.assign_pin_number() security definer;
alter function public.assign_project_number() security definer;
revoke all on function public.assign_pin_number() from public, anon, authenticated;
revoke all on function public.assign_project_number() from public, anon, authenticated;

-- Le créateur d'un projet y est ajouté, comme les admins.
create or replace function public.fn_auto_assign_admins_to_new_project()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into members_projects (member_id, project_id)
  select mo.member_id, NEW.id
  from members_organizations mo
  where mo.organization_id = NEW.organization_id
    and mo.role = 'admin'
  on conflict do nothing;

  if current_member_id() is not null
     and exists (
       select 1 from members_organizations mo
       where mo.organization_id = NEW.organization_id and mo.member_id = current_member_id()
     )
     and not exists (
       select 1 from members_projects mp
       where mp.project_id = NEW.id and mp.member_id = current_member_id()
     )
  then
    insert into members_projects (member_id, project_id) values (current_member_id(), NEW.id);
  end if;

  return NEW;
end;
$$;

-- Création de projet : admins et membres de l'organisation, pas les invités.
create or replace function public.create_project_with_defaults(p_name text, p_organization_id uuid)
returns table(project_id uuid, project_name text, project_number text, plan_id uuid, plan_name text, category_ids uuid[], status_ids uuid[])
language plpgsql security definer set search_path = public
as $$
DECLARE
  v_plan_id UUID;
  v_category_ids UUID[];
  v_status_ids UUID[];
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT is_super_admin()
     AND (NOT is_org_member(p_organization_id) OR is_org_guest(p_organization_id))
  THEN
    RAISE EXCEPTION 'Création de projet non autorisée' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.projects (name, organization_id)
  VALUES (p_name, p_organization_id)
  RETURNING projects.id, projects.name, projects.project_number
  INTO project_id, project_name, project_number;

  INSERT INTO public.plans (name, file_url, project_id, png_url, tiles_path, status, width, height)
  VALUES (
    'Sample Plan',
    '014ce9af-8fdd-4581-88ed-077039cf89b1/1748379744388_Sample_Floor_Plan__PDF_.pdf',
    project_id,
    '014ce9af-8fdd-4581-88ed-077039cf89b1/previews/1748379744388_Sample_Floor_Plan__PDF_-page1.png',
    '014ce9af-8fdd-4581-88ed-077039cf89b1/tiles/1748379744388_Sample_Floor_Plan__PDF_-page1',
    'ready', 6600, 5100
  )
  RETURNING plans.id, plans.name INTO v_plan_id, plan_name;
  plan_id := v_plan_id;

  WITH ins AS (
    INSERT INTO public.categories (name, icon, "order", project_id)
    VALUES
      ('Non assigne', 'unassigned', 0, project_id),
      ('Carrelage', 'carrelage', 1, project_id),
      ('Peinture', 'paint', 2, project_id),
      ('Extincteur', 'fire-extinguisher', 3, project_id),
      ('Plomberie', 'droplets', 4, project_id),
      ('Electricite', 'zap', 5, project_id)
    RETURNING id
  )
  SELECT array_agg(id) INTO v_category_ids FROM ins;
  category_ids := v_category_ids;

  WITH inss AS (
    INSERT INTO public."Status" (name, color, "order", project_id)
    VALUES
      ('En cours', '#c43b8b', 0, project_id),
      ('A valider', '#0835e7', 1, project_id),
      ('Bloque', '#e13e33', 2, project_id),
      ('Termine', '#359c5b', 4, project_id)
    RETURNING id
  )
  SELECT array_agg(id) INTO v_status_ids FROM inss;
  status_ids := v_status_ids;

  RETURN NEXT;
END;
$$;
revoke all on function public.create_project_with_defaults(text, uuid) from public, anon;
grant execute on function public.create_project_with_defaults(text, uuid) to authenticated, service_role;

-- Conversations : uniquement dans un projet auquel on a accès.
create or replace function public.create_discussion_group(p_project_id uuid, p_name text, p_description text default null)
returns discussions_groups
language plpgsql security definer set search_path = public
as $$
DECLARE
  v_user_id UUID;
  v_group   discussions_groups;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Projet inaccessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO discussions_groups (project_id, name, description, created_by)
  VALUES (p_project_id, p_name, p_description, v_user_id)
  RETURNING * INTO v_group;

  RETURN v_group;
END;
$$;
revoke all on function public.create_discussion_group(uuid, text, text) from public, anon;
grant execute on function public.create_discussion_group(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Garde-fous que les règles de lignes ne savent pas exprimer
-- ---------------------------------------------------------------------------

-- Pins : l'auteur d'une création ou d'une modification est toujours la personne
-- connectée (l'historique ne peut pas être attribué à quelqu'un d'autre), et un
-- invité ne peut changer que le statut, pour un statut du même projet.
create or replace function public.pdf_pins_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  me uuid;
begin
  if auth.uid() is null then
    return new; -- backend
  end if;
  me := current_member_id();

  if tg_op = 'INSERT' then
    if me is not null then
      new.created_by := me;
      new.updated_by := me;
    end if;
    return new;
  end if;

  if me is not null then
    new.updated_by := me;
  end if;
  new.created_by := old.created_by; -- l'auteur d'un pin ne change pas

  if is_super_admin() then
    return new;
  end if;

  if is_org_guest(project_org_id(old.project_id)) then
    if (to_jsonb(new) - 'status_id' - 'updated_at' - 'updated_by')
       is distinct from
       (to_jsonb(old) - 'status_id' - 'updated_at' - 'updated_by')
    then
      raise exception 'Un invité ne peut modifier que le statut' using errcode = '42501';
    end if;
    if new.status_id is distinct from old.status_id
       and not exists (select 1 from "Status" st where st.id = new.status_id and st.project_id = old.project_id)
    then
      raise exception 'Statut inconnu dans ce projet' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.pdf_pins_guard() from public, anon, authenticated;

drop trigger if exists trg_pdf_pins_guard_guest on public.pdf_pins;
drop function if exists public.pdf_pins_guard_guest();
drop trigger if exists trg_pdf_pins_guard on public.pdf_pins;
create trigger trg_pdf_pins_guard
  before insert or update on public.pdf_pins
  for each row execute function public.pdf_pins_guard();

-- Un projet ne change pas d'organisation, et ses compteurs ne se modifient pas à la main.
create or replace function public.projects_guard_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_super_admin() or pg_trigger_depth() > 1 then
    return new; -- backend, administration, ou mise à jour faite par un autre déclencheur
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.last_pin_number is distinct from old.last_pin_number
     or new.project_number is distinct from old.project_number
  then
    raise exception 'Champ non modifiable' using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke all on function public.projects_guard_update() from public, anon, authenticated;

drop trigger if exists trg_projects_guard_update on public.projects;
create trigger trg_projects_guard_update
  before update on public.projects
  for each row execute function public.projects_guard_update();

-- ---------------------------------------------------------------------------
-- 4. Règles par table
-- ---------------------------------------------------------------------------

-- projects ------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

create policy projects_select on public.projects for select to authenticated
  using (is_org_admin(organization_id) or is_super_admin() or id in (select my_project_ids()));
create policy projects_insert on public.projects for insert to authenticated
  with check (is_org_admin(organization_id) or is_super_admin());
create policy projects_update on public.projects for update to authenticated
  using (id in (select my_editable_project_ids()))
  with check (id in (select my_editable_project_ids()));
create policy projects_delete on public.projects for delete to authenticated
  using (is_org_admin(organization_id) or is_super_admin());

-- plans ---------------------------------------------------------------------
drop policy if exists plans_select on public.plans;
drop policy if exists plans_insert on public.plans;
drop policy if exists plans_update on public.plans;
drop policy if exists plans_delete on public.plans;

create policy plans_select on public.plans for select to authenticated
  using (project_id in (select my_project_ids()));
create policy plans_insert on public.plans for insert to authenticated
  with check (can_edit_project(project_id));
create policy plans_update on public.plans for update to authenticated
  using (project_id in (select my_editable_project_ids()))
  with check (project_id in (select my_editable_project_ids()));
create policy plans_delete on public.plans for delete to authenticated
  using (is_org_admin(project_org_id(project_id)) or is_super_admin());

-- Status --------------------------------------------------------------------
drop policy if exists status_select on public."Status";
drop policy if exists status_insert on public."Status";
drop policy if exists status_update on public."Status";
drop policy if exists status_delete on public."Status";

create policy status_select on public."Status" for select to authenticated
  using (project_id in (select my_project_ids()));
create policy status_insert on public."Status" for insert to authenticated
  with check (can_edit_project(project_id));
create policy status_update on public."Status" for update to authenticated
  using (is_org_admin(project_org_id(project_id)) or is_super_admin())
  with check (is_org_admin(project_org_id(project_id)) or is_super_admin());
create policy status_delete on public."Status" for delete to authenticated
  using (is_org_admin(project_org_id(project_id)) or is_super_admin());

-- categories ----------------------------------------------------------------
drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;

create policy categories_select on public.categories for select to authenticated
  using (project_id in (select my_project_ids()));
create policy categories_insert on public.categories for insert to authenticated
  with check (can_edit_project(project_id));
create policy categories_update on public.categories for update to authenticated
  using (is_org_admin(project_org_id(project_id)) or is_super_admin())
  with check (is_org_admin(project_org_id(project_id)) or is_super_admin());
create policy categories_delete on public.categories for delete to authenticated
  using (is_org_admin(project_org_id(project_id)) or is_super_admin());

-- tags ----------------------------------------------------------------------
drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags for insert to authenticated
  with check (is_org_member(organization_id) and not is_org_guest(organization_id));

-- pdf_pins ------------------------------------------------------------------
drop policy if exists pins_select on public.pdf_pins;
drop policy if exists pins_insert on public.pdf_pins;
drop policy if exists pins_update on public.pdf_pins;
drop policy if exists pins_delete on public.pdf_pins;

create policy pins_select on public.pdf_pins for select to authenticated
  using (
    project_id in (select my_editable_project_ids())
    or (assigned_to = (select current_member_id()) and project_id in (select my_project_ids()))
  );
create policy pins_insert on public.pdf_pins for insert to authenticated
  with check (can_edit_project(project_id));
create policy pins_update on public.pdf_pins for update to authenticated
  using (
    project_id in (select my_editable_project_ids())
    or (assigned_to = (select current_member_id()) and project_id in (select my_project_ids()))
  )
  with check (
    project_id in (select my_editable_project_ids())
    or (assigned_to = (select current_member_id()) and project_id in (select my_project_ids()))
  );
create policy pins_delete on public.pdf_pins for delete to authenticated
  using (
    is_org_admin(project_org_id(project_id))
    or is_super_admin()
    or (created_by = (select current_member_id()) and can_edit_project(project_id))
  );

-- pin_tags ------------------------------------------------------------------
drop policy if exists pin_tags_select on public.pin_tags;
drop policy if exists pin_tags_insert on public.pin_tags;
drop policy if exists pin_tags_delete on public.pin_tags;

-- La sous-requête sur pdf_pins applique d'elle-même les règles de visibilité des pins.
create policy pin_tags_select on public.pin_tags for select to authenticated
  using (exists (select 1 from pdf_pins p where p.id = pin_tags.pin_id));
create policy pin_tags_insert on public.pin_tags for insert to authenticated
  with check (exists (select 1 from pdf_pins p where p.id = pin_tags.pin_id and can_edit_project(p.project_id)));
create policy pin_tags_delete on public.pin_tags for delete to authenticated
  using (exists (select 1 from pdf_pins p where p.id = pin_tags.pin_id and can_edit_project(p.project_id)));

-- pins_photos ---------------------------------------------------------------
drop policy if exists pin_photos_select on public.pins_photos;
drop policy if exists pin_photos_insert on public.pins_photos;
drop policy if exists pin_photos_update on public.pins_photos;
drop policy if exists pin_photos_delete on public.pins_photos;

create policy pin_photos_select on public.pins_photos for select to authenticated
  using (
    exists (select 1 from pdf_pins p where p.id = pins_photos.pin_id)
    or (pin_id is null and project_id in (select my_editable_project_ids()))
  );
create policy pin_photos_insert on public.pins_photos for insert to authenticated
  with check (
    (sender_id is null or sender_id = (select current_member_id()))
    and (
      -- le projet indiqué est celui du pin
      exists (
        select 1 from pdf_pins p
        where p.id = pins_photos.pin_id
          and (pins_photos.project_id is null or pins_photos.project_id = p.project_id)
      )
      or (pin_id is null and can_edit_project(project_id))
    )
  );
create policy pin_photos_update on public.pins_photos for update to authenticated
  using (
    (
      exists (select 1 from pdf_pins p where p.id = pins_photos.pin_id)
      and (
        sender_id = (select current_member_id())
        or exists (select 1 from pdf_pins p where p.id = pins_photos.pin_id and can_edit_project(p.project_id))
      )
    )
    or (pin_id is null and can_edit_project(project_id))
  )
  with check (
    exists (
      select 1 from pdf_pins p
      where p.id = pins_photos.pin_id
        and (pins_photos.project_id is null or pins_photos.project_id = p.project_id)
    )
    or (pin_id is null and can_edit_project(project_id))
  );
create policy pin_photos_delete on public.pins_photos for delete to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from pdf_pins p
      where p.id = pins_photos.pin_id
        and (is_org_admin(project_org_id(p.project_id)) or pins_photos.sender_id = (select current_member_id()))
    )
    or (pin_id is null and can_edit_project(project_id))
  );

-- comments ------------------------------------------------------------------
drop policy if exists comments_select on public.comments;
drop policy if exists comments_insert on public.comments;
drop policy if exists comments_update on public.comments;
drop policy if exists comments_delete on public.comments;

create policy comments_select on public.comments for select to authenticated
  using (exists (select 1 from pdf_pins p where p.id = comments.pin_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (
    (sender_id is null or sender_id = (select current_member_id()))
    and exists (select 1 from pdf_pins p where p.id = comments.pin_id)
  );
create policy comments_update on public.comments for update to authenticated
  using (
    exists (select 1 from pdf_pins p where p.id = comments.pin_id)
    and (sender_id = (select current_member_id()) or is_super_admin())
  )
  with check (exists (select 1 from pdf_pins p where p.id = comments.pin_id));
create policy comments_delete on public.comments for delete to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from pdf_pins p
      where p.id = comments.pin_id
        and (is_org_admin(project_org_id(p.project_id)) or comments.sender_id = (select current_member_id()))
    )
  );

-- events --------------------------------------------------------------------
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (
    exists (select 1 from pdf_pins p where p.id = events.pin_id)
    or (pin_id is null and project_id in (select my_editable_project_ids()))
  );

-- documents, dossiers, versions ---------------------------------------------
drop policy if exists documents_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_select on public.documents for select to authenticated
  using (project_id in (select my_project_ids()));
create policy documents_insert on public.documents for insert to authenticated
  with check (can_edit_project(project_id));
create policy documents_update on public.documents for update to authenticated
  using (project_id in (select my_editable_project_ids()))
  with check (project_id in (select my_editable_project_ids()));
create policy documents_delete on public.documents for delete to authenticated
  using (project_id in (select my_editable_project_ids()));

drop policy if exists folders_select on public.folders;
drop policy if exists folders_insert on public.folders;
drop policy if exists folders_update on public.folders;
drop policy if exists folders_delete on public.folders;

create policy folders_select on public.folders for select to authenticated
  using (project_id in (select my_project_ids()));
create policy folders_insert on public.folders for insert to authenticated
  with check (can_edit_project(project_id));
create policy folders_update on public.folders for update to authenticated
  using (project_id in (select my_editable_project_ids()))
  with check (project_id in (select my_editable_project_ids()));
create policy folders_delete on public.folders for delete to authenticated
  using (project_id in (select my_editable_project_ids()));

drop policy if exists document_versions_select on public.document_versions;
drop policy if exists document_versions_insert on public.document_versions;
drop policy if exists document_versions_update on public.document_versions;
drop policy if exists document_versions_delete on public.document_versions;

create policy document_versions_select on public.document_versions for select to authenticated
  using (can_access_project(document_project_id(document_id)));
create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (can_edit_project(document_project_id(document_id)));
create policy document_versions_update on public.document_versions for update to authenticated
  using (can_edit_project(document_project_id(document_id)))
  with check (can_edit_project(document_project_id(document_id)));
create policy document_versions_delete on public.document_versions for delete to authenticated
  using (can_edit_project(document_project_id(document_id)));

-- La vue doit appliquer les droits de la personne qui la lit, pas ceux de son propriétaire.
alter view public.documents_with_version set (security_invoker = true);

-- members_organizations : un admin d'organisation pouvait se donner (ou donner)
-- le rôle super_admin, donc l'accès à toutes les organisations. Seuls les rôles
-- de l'application sont attribuables ; le rôle super_admin ne se donne qu'en base.
drop policy if exists members_insert on public.members_organizations;
drop policy if exists members_update on public.members_organizations;
create policy members_insert on public.members_organizations for insert to authenticated
  with check (
    is_super_admin()
    or (is_org_admin(organization_id) and role in ('admin', 'Membres', 'guest'))
  );
create policy members_update on public.members_organizations for update to authenticated
  using (is_org_admin(organization_id) or is_super_admin())
  with check (
    is_super_admin()
    or (is_org_admin(organization_id) and role in ('admin', 'Membres', 'guest'))
  );

-- « Quitter l'organisation » comparait un identifiant de membre à un identifiant
-- de connexion et ne correspondait donc jamais.
drop policy if exists members_delete on public.members_organizations;
create policy members_delete on public.members_organizations for delete to authenticated
  using (is_org_admin(organization_id) or is_super_admin() or member_id = (select current_member_id()));

-- discussions : une conversation ne peut pas être déplacée vers un projet
-- auquel son administrateur n'a pas accès.
drop policy if exists disc_groups_update on public.discussions_groups;
create policy disc_groups_update on public.discussions_groups for update to authenticated
  using (is_discussion_admin(id, auth.uid()))
  with check (is_discussion_admin(id, auth.uid()) and can_access_project(project_id));

-- On n'ajoute à une conversation que des personnes du projet.
drop policy if exists disc_members_insert on public.discussions_members;
create policy disc_members_insert on public.discussions_members for insert to authenticated
  with check (is_discussion_admin(group_id, auth.uid()) and discussion_user_can_join(group_id, user_id));

-- ---------------------------------------------------------------------------
-- 5. Fichiers (storage)
-- ---------------------------------------------------------------------------

-- Photos de pins : pinphotos/<projet>/<fichier>
drop policy if exists "pinphotos authenticated insert" on storage.objects;
drop policy if exists pinphotos_project_insert on storage.objects;
create policy pinphotos_project_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pinphotos'
    and public.can_access_project(public.safe_uuid((string_to_array(name, '/'))[1]))
  );

-- Images jointes aux rapports : reports/planning/<projet>/<fichier>
-- (les rapports générés sont déposés par le backend).
drop policy if exists reports_authenticated_insert on storage.objects;
drop policy if exists reports_project_insert on storage.objects;
create policy reports_project_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (string_to_array(name, '/'))[1] = 'planning'
    and public.can_access_project(public.safe_uuid((string_to_array(name, '/'))[2]))
  );

-- Plans : déposés uniquement par le backend.
drop policy if exists project_plans_authenticated_insert on storage.objects;

-- Logos d'organisation : logos/<organisation>/<fichier>, réservés aux admins.
drop policy if exists "Allow authenticated uploads to logos" on storage.objects;
drop policy if exists "Allow authenticated updates to logos" on storage.objects;
drop policy if exists logos_admin_insert on storage.objects;
drop policy if exists logos_admin_update on storage.objects;
create policy logos_admin_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.is_org_admin(public.safe_uuid((string_to_array(name, '/'))[1]))
  );
create policy logos_admin_update on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and public.is_org_admin(public.safe_uuid((string_to_array(name, '/'))[1]))
  )
  with check (
    bucket_id = 'logos'
    and public.is_org_admin(public.safe_uuid((string_to_array(name, '/'))[1]))
  );

-- Photo et logo client d'un projet : projects/(project-pictures|client-logos)/<projet>-…
drop policy if exists "Authenticated users can upload to projects" on storage.objects;
drop policy if exists "Authenticated users can update projects bucket" on storage.objects;
drop policy if exists "Authenticated users can delete projects bucket" on storage.objects;
drop policy if exists projects_bucket_insert on storage.objects;
drop policy if exists projects_bucket_update on storage.objects;
drop policy if exists projects_bucket_delete on storage.objects;
create policy projects_bucket_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'projects'
    and (string_to_array(name, '/'))[1] in ('project-pictures', 'client-logos')
    and public.can_edit_project(public.safe_uuid(left((string_to_array(name, '/'))[2], 36)))
  );
create policy projects_bucket_update on storage.objects for update to authenticated
  using (
    bucket_id = 'projects'
    and public.can_edit_project(public.safe_uuid(left((string_to_array(name, '/'))[2], 36)))
  )
  with check (
    bucket_id = 'projects'
    and (string_to_array(name, '/'))[1] in ('project-pictures', 'client-logos')
    and public.can_edit_project(public.safe_uuid(left((string_to_array(name, '/'))[2], 36)))
  );
create policy projects_bucket_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'projects'
    and public.can_edit_project(public.safe_uuid(left((string_to_array(name, '/'))[2], 36)))
  );

-- Pièces jointes des conversations : son propre dossier, ou une conversation dont on fait partie.
drop policy if exists disc_storage_select on storage.objects;
create policy disc_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'discussions'
    and (
      (string_to_array(name, '/'))[1] = (auth.uid())::text
      or public.storage_discussion_can_read(name)
    )
  );

-- Documents : droits du projet du document.
drop policy if exists documents_bucket_select on storage.objects;
drop policy if exists documents_bucket_insert on storage.objects;
drop policy if exists documents_bucket_delete on storage.objects;
create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.can_access_project(public.storage_document_project_id(name)));
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_edit_project(public.storage_document_project_id(name)));
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_edit_project(public.storage_document_project_id(name)));

commit;
