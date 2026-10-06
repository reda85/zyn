-- Documents : cloisonnement par organisation.
-- Avant : « auth.uid() IS NOT NULL » — tout compte créé (l'inscription est
-- ouverte) pouvait lire, modifier et supprimer les documents de toutes les
-- organisations.

create or replace function public.document_org_id(doc_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.organization_id from documents d join projects p on p.id = d.project_id where d.id = doc_id
$$;
revoke all on function public.document_org_id(uuid) from public, anon;
grant execute on function public.document_org_id(uuid) to authenticated, service_role;

-- ── folders ───────────────────────────────────────────────────────────────────
drop policy if exists "Users manage folders in own projects" on public.folders;
drop policy if exists "folders: insertion membres projet" on public.folders;
drop policy if exists "folders: lecture membres projet" on public.folders;
drop policy if exists "folders: modification" on public.folders;
drop policy if exists "folders: suppression" on public.folders;

create policy folders_select on public.folders for select to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());
create policy folders_insert on public.folders for insert to authenticated
  with check (is_org_member(project_org_id(project_id)));
create policy folders_update on public.folders for update to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());
create policy folders_delete on public.folders for delete to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());

-- ── documents ─────────────────────────────────────────────────────────────────
drop policy if exists "Users manage docs in own projects" on public.documents;
drop policy if exists "documents: insertion" on public.documents;
drop policy if exists "documents: lecture" on public.documents;
drop policy if exists "documents: modification" on public.documents;
drop policy if exists "documents: suppression" on public.documents;

create policy documents_select on public.documents for select to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());
create policy documents_insert on public.documents for insert to authenticated
  with check (is_org_member(project_org_id(project_id)));
create policy documents_update on public.documents for update to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());
create policy documents_delete on public.documents for delete to authenticated
  using (is_org_member(project_org_id(project_id)) or is_super_admin());

-- ── document_versions ─────────────────────────────────────────────────────────
drop policy if exists "Users manage versions in own projects" on public.document_versions;
drop policy if exists "document_versions: insertion" on public.document_versions;
drop policy if exists "document_versions: lecture" on public.document_versions;
drop policy if exists "document_versions: modification" on public.document_versions;
drop policy if exists "document_versions: suppression" on public.document_versions;

create policy document_versions_select on public.document_versions for select to authenticated
  using (is_org_member(document_org_id(document_id)) or is_super_admin());
create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (is_org_member(document_org_id(document_id)));
create policy document_versions_update on public.document_versions for update to authenticated
  using (is_org_member(document_org_id(document_id)) or is_super_admin());
create policy document_versions_delete on public.document_versions for delete to authenticated
  using (is_org_member(document_org_id(document_id)) or is_super_admin());

-- La vue appliquait les droits de son créateur : elle contournait les policies ci-dessus.
alter view public.documents_with_version set (security_invoker = true);

-- ── Stockage : bucket « documents » ───────────────────────────────────────────
-- Chemin des fichiers : <auth uid>/<document id>/<nom>. L'accès suit le document.
create or replace function public.storage_document_org_id(object_name text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  doc_id uuid;
begin
  begin
    doc_id := (storage.foldername(object_name))[2]::uuid;
  exception when others then
    return null; -- chemin inattendu : aucun accès
  end;
  return document_org_id(doc_id);
end;
$$;
revoke all on function public.storage_document_org_id(text) from public, anon;
grant execute on function public.storage_document_org_id(text) to authenticated, service_role;

drop policy if exists "storage documents: lecture" on storage.objects;
drop policy if exists "storage documents: suppression" on storage.objects;
drop policy if exists "storage documents: upload" on storage.objects;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and is_org_member(storage_document_org_id(name)));
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and is_org_member(storage_document_org_id(name)));
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and is_org_member(storage_document_org_id(name)));

-- ── Stockage : fin des écritures anonymes ─────────────────────────────────────
-- « Allow public insertd » (CHECK true) autorisait n'importe qui, sans compte,
-- à déposer des fichiers dans TOUS les buckets.
drop policy if exists "Allow public insertd 1x5x652_0" on storage.objects;
-- Upload anonyme dans pinphotos et project-plans (malgré leur nom).
drop policy if exists "Allow authenticated uploads 1x5x652_0" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder vsa8qe_1" on storage.objects;
-- Modification / suppression anonymes dans les dossiers « public ».
drop policy if exists "Give anon users access to JPG images in folder 1x5x652_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1x5x652_3" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder vsa8qe_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder vsa8qe_3" on storage.objects;

-- Les utilisateurs connectés gardent l'upload là où l'application en a besoin
-- (pinphotos et logos ont déjà leur policy « authenticated »).
drop policy if exists reports_authenticated_insert on storage.objects;
create policy reports_authenticated_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'reports');
drop policy if exists project_plans_authenticated_insert on storage.objects;
create policy project_plans_authenticated_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-plans');

-- Pièces jointes des discussions : lecture réservée aux comptes connectés
-- (la policy s'appliquait aussi au rôle anonyme).
drop policy if exists disc_storage_select on storage.objects;
create policy disc_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'discussions');
