-- Les tâches du planning sont des tâches de l'application.
--
-- Une tâche planifiée est un pin (table pdf_pins) qui porte une date de début :
-- elle apparaît dans « Tâches » (web et mobile), dans les rapports, avec son
-- statut, son lot, son intervenant et son échéance (= fin dans le planning).
-- Le planning n'a plus en propre que les jalons.

alter table public.pdf_pins
  add column if not exists date_debut date,
  add column if not exists avancement smallint;

alter table public.pdf_pins drop constraint if exists pdf_pins_avancement_check;
alter table public.pdf_pins
  add constraint pdf_pins_avancement_check check (avancement is null or avancement between 0 and 100);

create index if not exists idx_pdf_pins_planning on public.pdf_pins (project_id) where date_debut is not null and deleted_at is null;

-- Tâches déjà saisies dans le planning → tâches de l'application.
-- Statut : le premier du projet, ou le dernier (levé) si la tâche est terminée.
insert into public.pdf_pins (project_id, name, category_id, status_id, date_debut, due_date, avancement, created_by, updated_by, created_at)
select
  t.project_id,
  t.libelle,
  coalesce(t.lot_id, (select c.id from categories c where c.project_id = t.project_id and c.icon = 'unassigned' order by c."order" limit 1)),
  case when t.avancement >= 100
    then (select s.id from "Status" s where s.project_id = t.project_id order by s."order" desc limit 1)
    else (select s.id from "Status" s where s.project_id = t.project_id order by s."order" asc limit 1)
  end,
  t.date_debut,
  (t.date_fin::timestamp + interval '12 hours') at time zone 'UTC',
  t.avancement,
  t.created_by,
  t.created_by,
  t.created_at
from public.planning_tasks t
where t.type = 'tache';

delete from public.planning_tasks where type = 'tache';

-- Il ne reste que des jalons.
alter table public.planning_tasks drop constraint if exists planning_tasks_jalons_only;
alter table public.planning_tasks add constraint planning_tasks_jalons_only check (type = 'jalon');
