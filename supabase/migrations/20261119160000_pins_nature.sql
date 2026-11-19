-- Nature d'un élément de la liste « Tâches » : réserve, tâche ou observation.
--
-- La colonne pdf_pins.type existait sans être utilisée (toujours vide) ; elle
-- porte désormais cette nature.
--   · reserve     : défaut constaté à lever (cas historique des pins sur plan) ;
--   · tache       : travail à faire, planifiable (date de début, avancement) ;
--   · observation : constat ou remarque, sans travail attendu.
--
-- Reprise de l'existant : une tâche du planning (date de début) ou un élément
-- sans plan (créé depuis la liste) est une tâche ; le reste, posé sur un plan,
-- est une réserve. La nature se change ensuite depuis la fiche.

update public.pdf_pins set type = case
  when date_debut is not null or plan_id is null then 'tache'
  else 'reserve'
end
where type is null or type not in ('reserve', 'tache', 'observation');

-- Sans nature précisée (anciennes versions des applications) : même règle
-- qu'à la reprise — sans plan ou planifiée, c'est une tâche ; sur plan, une réserve.
create or replace function public.set_pin_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type is null then
    new.type := case when new.date_debut is not null or new.plan_id is null then 'tache' else 'reserve' end;
  end if;
  return new;
end;
$$;
revoke execute on function public.set_pin_type() from public, anon, authenticated;

drop trigger if exists pdf_pins_set_type on public.pdf_pins;
create trigger pdf_pins_set_type before insert on public.pdf_pins
  for each row execute function public.set_pin_type();

alter table public.pdf_pins alter column type drop default;
alter table public.pdf_pins alter column type set not null;

alter table public.pdf_pins drop constraint if exists pdf_pins_type_check;
alter table public.pdf_pins
  add constraint pdf_pins_type_check check (type in ('reserve', 'tache', 'observation'));

create index if not exists idx_pdf_pins_project_type on public.pdf_pins (project_id, type) where deleted_at is null;
