-- Durcissement des fonctions signalées par l'analyseur de sécurité Supabase.

-- search_path fixé : une fonction ne doit pas dépendre du search_path de l'appelant.
alter function public.is_org_member(uuid) set search_path = public;
alter function public.is_org_admin(uuid) set search_path = public;
alter function public.is_super_admin() set search_path = public;
alter function public.project_org_id(uuid) set search_path = public;
alter function public.handle_pdf_pins_event() set search_path = public;
alter function public.handle_pins_photos_event() set search_path = public;
alter function public.assign_pin_number() set search_path = public;
alter function public.assign_project_number() set search_path = public;
alter function public.soft_delete_pin(uuid) set search_path = public;
alter function public.soft_delete_plan(uuid) set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.create_project_with_defaults(text, uuid) set search_path = public;

-- Fonctions de déclencheur : jamais appelées directement, donc pas exposées en RPC.
-- (Le droit EXECUTE n'est pas requis pour qu'un déclencheur s'exécute.)
revoke execute on function public.handle_pdf_pins_event() from public, anon, authenticated;
revoke execute on function public.handle_pins_photos_event() from public, anon, authenticated;
revoke execute on function public.discussions_add_creator_as_admin() from public, anon, authenticated;
revoke execute on function public.fn_auto_assign_admin_to_projects() from public, anon, authenticated;
revoke execute on function public.fn_auto_assign_admins_to_new_project() from public, anon, authenticated;

-- RPC réservées aux comptes connectés.
revoke execute on function public.create_discussion_group(uuid, text, text) from public, anon;
revoke execute on function public.get_discussion_unread(uuid) from public, anon;
revoke execute on function public.mark_discussion_read(uuid) from public, anon;
revoke execute on function public.soft_delete_pin(uuid) from public, anon;
revoke execute on function public.soft_delete_plan(uuid) from public, anon;
revoke execute on function public.create_project_with_defaults(text, uuid) from public, anon;
grant execute on function public.create_discussion_group(uuid, text, text) to authenticated, service_role;
grant execute on function public.get_discussion_unread(uuid) to authenticated, service_role;
grant execute on function public.mark_discussion_read(uuid) to authenticated, service_role;
grant execute on function public.soft_delete_pin(uuid) to authenticated, service_role;
grant execute on function public.soft_delete_plan(uuid) to authenticated, service_role;
grant execute on function public.create_project_with_defaults(text, uuid) to authenticated, service_role;
