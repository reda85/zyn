-- ──────────────────────────────────────────────────────────────────────────────
-- Organisation de démonstration réinitialisable (comme sur Lotio)
--
-- Une organisation marquée « démo » (par le super-admin ou en SQL, jamais par
-- ses propres utilisateurs) peut être remise dans un état connu avant chaque
-- présentation : les données de chantier de ses projets sont effacées, puis un
-- scénario est recréé avec des dates calculées à partir d'aujourd'hui.
--
-- Conservé : l'organisation, ses membres et leurs comptes, ses projets, leurs
-- plans (fichiers déposés une fois dans l'application), leurs documents,
-- statuts, tags et discussions, et les modèles de rapport.
-- Recréé : entreprises, lots, réserves, tâches, observations, photos (prises
-- dans la réserve de photos de la démo), commentaires, jalons, réunions de
-- chantier. Effacé : historique des rapports, notifications, journal.
--
-- Réserve de photos : à chaque remise à zéro, les photos présentes dans la démo
-- sont ajoutées à organizations.demo_assets ; le scénario les réutilise. Pour
-- enrichir la démo, ajoutez des photos à n'importe quel élément, puis
-- réinitialisez.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.organizations add column if not exists is_demo boolean not null default false;
alter table public.organizations add column if not exists demo_reset_at timestamptz;
alter table public.organizations add column if not exists demo_assets jsonb not null default '{}'::jsonb;

comment on column public.organizations.is_demo is
  'Organisation de démonstration : ses données de chantier peuvent être effacées et recréées par reset_demo().';

-- Les administrateurs d'une organisation peuvent la modifier (nom, logo…), mais
-- pas la marquer « démo » ni toucher à sa réserve de photos.
create or replace function public.organizations_guard_demo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.is_demo is distinct from old.is_demo or new.demo_assets is distinct from old.demo_assets
      or new.demo_reset_at is distinct from old.demo_reset_at)
     and auth.uid() is not null
     and not is_super_admin()
     and coalesce(current_setting('zs.demo_reset', true), '') <> 'on' then
    raise exception 'Seul le super-administrateur peut modifier le statut de démonstration.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_organizations_guard_demo on public.organizations;
create trigger trg_organizations_guard_demo
  before update on public.organizations
  for each row execute function public.organizations_guard_demo();

-- ── Petits outils ────────────────────────────────────────────────────────────
-- Valeur pseudo-aléatoire stable dans [0, 1) : mêmes positions à chaque remise à zéro.
create or replace function public._demo_rand(p_seed text) returns double precision
language sql immutable as $$
  select ('x' || substr(md5(p_seed), 1, 8))::bit(32)::bigint / 4294967296.0
$$;

-- ── Vidage ───────────────────────────────────────────────────────────────────
create or replace function public._demo_clear(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_projects uuid[];
  v_claims text;
  v_sub text;
begin
  if not exists (select 1 from organizations where id = p_org and is_demo) then
    raise exception 'Cette organisation n''est pas une organisation de démonstration.';
  end if;
  select coalesce(array_agg(id), '{}') into v_projects from projects where organization_id = p_org;

  -- Seulement celles des projets de la démo : un membre de la démo peut aussi
  -- appartenir à une vraie organisation.
  delete from notifications where project_id = any(v_projects);
  delete from reports where project_id = any(v_projects);
  -- Points avant réunions : supprimer une réunion rouvre les points qu'elle a soldés.
  delete from meeting_points where project_id = any(v_projects);
  delete from meetings where project_id = any(v_projects);           -- présents et avancements suivent
  delete from planning_tasks where project_id = any(v_projects);
  delete from events where project_id = any(v_projects);
  delete from comments where pin_id in (select id from pdf_pins where project_id = any(v_projects));
  delete from pins_photos where project_id = any(v_projects)
     or pin_id in (select id from pdf_pins where project_id = any(v_projects));
  delete from pdf_pins where project_id = any(v_projects);
  delete from categories where project_id = any(v_projects);
  delete from entreprises where organization_id = p_org;
  -- Les numéros d'éléments repartent à 1. Le compteur n'est modifiable que hors
  -- session utilisateur (projects_guard_update) : on la met de côté le temps de
  -- cette mise à jour.
  v_claims := current_setting('request.jwt.claims', true);
  v_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  update projects set last_pin_number = 0 where id = any(v_projects);
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
end $$;

-- ── Scénario d'un projet ─────────────────────────────────────────────────────
-- Un chantier de logements en second œuvre : gros œuvre terminé, étanchéité en
-- retard, corps d'état techniques en cours, finitions qui démarrent ; des
-- réserves à tous les stades, des observations de visite, un planning avec ses
-- jalons et deux réunions de chantier diffusées.
create or replace function public._demo_seed_project(p_org uuid, p_project uuid, p_admin uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Africa/Casablanca')::date;
  v_people uuid[];
  v_plans record;
  v_plan_ids uuid[];
  v_plan_names text[];
  v_photos jsonb;
  v_nphotos int;
  s_todo uuid; s_mid uuid; s_done uuid;
  v_ent uuid[] := array[]::uuid[];
  v_lot uuid[] := array[]::uuid[];
  v_pin uuid;
  v_m1 uuid := gen_random_uuid();
  v_m2 uuid := gen_random_uuid();
  v_pt uuid[] := array[]::uuid[];
  r record;
  i int; k int; p int;
  v_x double precision; v_y double precision;
  v_counts jsonb := '{}'::jsonb;
  v_status uuid;
begin
  -- Intervenants : les membres de l'organisation (l'administrateur en premier).
  select array_agg(m.id order by (m.id = p_admin) desc, m.created_at, m.id) into v_people
    from members m join members_organizations mo on mo.member_id = m.id
   where mo.organization_id = p_org;
  if v_people is null then v_people := array[p_admin]; end if;
  while array_length(v_people, 1) < 4 loop v_people := v_people || v_people[1]; end loop;

  -- Statuts du projet (créés s'il n'y en a pas) : premier, intermédiaire, dernier.
  if not exists (select 1 from "Status" where project_id = p_project) then
    insert into "Status" (project_id, name, "order", color) values
      (p_project, 'À faire', 0, '#c2410c'), (p_project, 'En cours', 1, '#c43b8b'), (p_project, 'Levée', 2, '#15803d');
  end if;
  select id into s_todo from "Status" where project_id = p_project order by "order" asc nulls last, created_at limit 1;
  select id into s_done from "Status" where project_id = p_project order by "order" desc nulls last, created_at desc limit 1;
  select id into s_mid from "Status" where project_id = p_project and id not in (s_todo, s_done)
   order by "order" nulls last limit 1;
  s_mid := coalesce(s_mid, s_todo);

  -- Plans prêts du projet (déposés une fois dans l'application).
  select array_agg(id order by created_at), array_agg(name order by created_at) into v_plan_ids, v_plan_names
    from plans where project_id = p_project and deleted_at is null and coalesce(status, 'ready') = 'ready';

  -- Réserve de photos de la démo.
  select coalesce(demo_assets -> 'photos', '[]'::jsonb) into v_photos from organizations where id = p_org;
  v_nphotos := jsonb_array_length(v_photos);

  -- ── Entreprises et lots ────────────────────────────────────────────────────
  for r in
    select * from (values
      (1, 'Gros œuvre',   'brick-wall',  'Bati Atlas',              'Gros œuvre',  'Hamid Ouazzani',  -210, -30,  -205, -28,  100),
      (2, 'Étanchéité',   'droplet-off', 'Étanchéité du Maroc',     'Étanchéité',  'Rachid Nour',     -60,  -10,  -55,  null, 85),
      (3, 'Plomberie',    'droplets',    'Hydro Plomberie Casa',    'Plomberie',   'Youssef Alami',   -90,  30,   -85,  null, 65),
      (4, 'Électricité',  'zap',         'Électro Souss',           'Électricité', 'Nadia Bennis',    -90,  35,   -80,  null, 70),
      (5, 'Menuiserie',   'doors',       'Menuiserie Bois Nord',    'Menuiserie',  'Karim Lahlou',    -20,  50,   -12,  null, 25),
      (6, 'Revêtements',  'carrelage',   'Déco Finitions Anfa',     'Carrelage',   'Salma Bennani',   -5,   60,   -3,   null, 5),
      (7, 'Peinture',     'paint',       'Peinture Pro Casa',       'Peinture',    'Omar Kettani',    20,   90,   null, null, 0),
      (8, 'Ventilation',  'air-vent',    'Clim Air Maroc',          'CVC',         'Leila Amrani',    10,   70,   null, null, 0)
    ) as t(ordre, lot, icon, ent, corps, contact, dp, fp, dr, fr, av)
    order by ordre
  loop
    insert into entreprises (organization_id, name, corps_etat, contact_name, phone, email)
    select p_org, r.ent, r.corps, r.contact, '06 ' || lpad((10 + r.ordre * 7)::text, 2, '0') || ' 45 ' || lpad((r.ordre * 11)::text, 2, '0') || ' 20',
           lower(replace(split_part(r.contact, ' ', 1), 'é', 'e')) || '@' || lower(regexp_replace(r.ent, '[^A-Za-z]', '', 'g')) || '.ma'
    where not exists (select 1 from entreprises where organization_id = p_org and name = r.ent);
    v_ent := v_ent || (select id from entreprises where organization_id = p_org and name = r.ent limit 1);

    insert into categories (project_id, name, icon, "order", entreprise_id,
                            date_debut_prevue, date_fin_prevue, date_debut_reelle, date_fin_reelle, avancement)
    values (p_project, r.lot, r.icon, r.ordre, v_ent[r.ordre],
            d + r.dp, d + r.fp, case when r.dr is null then null else d + r.dr end,
            case when r.fr is null then null else d + r.fr end, r.av)
    returning id into v_pin;
    v_lot := v_lot || v_pin;
  end loop;

  -- ── Jalons ─────────────────────────────────────────────────────────────────
  insert into planning_tasks (project_id, libelle, type, date_debut, date_fin, avancement, ordre, created_by) values
    (p_project, 'Fin du gros œuvre',      'jalon', d - 28, d - 28, 100, 1, p_admin),
    (p_project, 'Hors d''eau',            'jalon', d - 6,  d - 6,  0,   2, p_admin),
    (p_project, 'Hors d''air',            'jalon', d + 25, d + 25, 0,   3, p_admin),
    (p_project, 'Réception des travaux',  'jalon', d + 100, d + 100, 0, 4, p_admin);

  -- ── Éléments : réserves, tâches, observations ──────────────────────────────
  -- (nature, lot, nom, description, statut 0/1/2, échéance en jours, début, avancement, créé il y a n jours, intervenant, photos)
  k := 0;
  for r in
    select * from (values
      -- Tâches du planning (une à trois par lot)
      ('tache', 1, 'Dalle haute R+3 et acrotères',          'Coulage et décoffrage.',                          2, -32, -60,  100, 70, 2, 0),
      ('tache', 1, 'Escaliers et cages d''ascenseur',        null,                                              2, -26, -45,  100, 50, 2, 0),
      ('tache', 2, 'Étanchéité toiture terrasse',            'Complexe bicouche et relevés.',                   1, -10, -40,  85,  45, 3, 1),
      ('tache', 2, 'Étanchéité des salles d''eau',           'SPEC sous carrelage.',                            1, 8,   -20,  60,  25, 3, 0),
      ('tache', 3, 'Colonnes montantes EF/EC',               null,                                              1, 6,   -60,  80,  60, 1, 0),
      ('tache', 3, 'Raccordements sanitaires',               'Logements A11 à A34.',                            1, 30,  -10,  35,  15, 1, 0),
      ('tache', 4, 'Tirage des câbles',                      null,                                              2, -5,  -70,  100, 70, 2, 0),
      ('tache', 4, 'Appareillage et tableaux',               'Pose après peinture des murs.',                   1, 35,  -8,   20,  10, 2, 0),
      ('tache', 5, 'Pose des portes palières',               null,                                              1, 20,  -12,  40,  12, 3, 0),
      ('tache', 5, 'Menuiseries extérieures bâtiment A',     'Livraison prévue la semaine prochaine.',          0, 45,  5,    0,   8,  3, 0),
      ('tache', 6, 'Carrelage parties communes',             null,                                              1, 40,  -3,   10,  5,  1, 0),
      ('tache', 6, 'Faïence salles de bains',                null,                                              0, 60,  12,   0,   5,  1, 0),
      ('tache', 7, 'Enduits et peinture intérieure',         null,                                              0, 90,  20,   0,   5,  2, 0),
      ('tache', 8, 'Réseaux de ventilation',                 'VMC simple flux.',                                0, 70,  10,   0,   5,  3, 0),
      -- Réserves
      ('reserve', 1, 'Fissure en pied de voile, séjour A11', 'Fissure de 2 mm, à reprendre au mortier de réparation.', 1, -6,  null, null, 21, 2, 2),
      ('reserve', 1, 'Nid de cailloux poteau P12',           'Ragréage à prévoir avant enduit.',                0, -3,  null, null, 18, 2, 1),
      ('reserve', 1, 'Réservation gaine électrique manquante', 'Carottage à faire en accord avec le BET.',      2, -12, null, null, 30, 2, 0),
      ('reserve', 2, 'Relevé d''étanchéité décollé, terrasse B', 'Sur 1,5 m le long de l''acrotère nord.',      0, -2,  null, null, 9,  3, 2),
      ('reserve', 2, 'Trace d''infiltration plafond A34',    'Après les pluies de la semaine dernière.',        1, 4,   null, null, 6,  3, 1),
      ('reserve', 3, 'Fuite au raccord EF, SDB A12',         'Goutte-à-goutte sous le lavabo.',                 1, 2,   null, null, 7,  1, 1),
      ('reserve', 3, 'Regard EP non scellé',                 null,                                              0, 5,   null, null, 4,  1, 0),
      ('reserve', 3, 'Calorifuge manquant en gaine palière', null,                                              2, -8,  null, null, 25, 1, 0),
      ('reserve', 4, 'Prise manquante, cuisine A11',         'Prévue au plan, non posée.',                      0, 1,   null, null, 5,  2, 1),
      ('reserve', 4, 'Boîtier sans appareillage, chambre 2', null,                                              1, 6,   null, null, 8,  2, 0),
      ('reserve', 4, 'Tableau électrique non étiqueté A21',  null,                                              2, -15, null, null, 28, 2, 0),
      ('reserve', 5, 'Porte palière A11 à régler',           'Frottement en partie haute.',                     0, 7,   null, null, 3,  3, 1),
      ('reserve', 5, 'Joint de vitrage absent, séjour B12',  null,                                              0, 10,  null, null, 2,  3, 0),
      ('reserve', 6, 'Carreau fêlé, palier 2e étage',        'À remplacer, prévoir un carton de réserve.',      0, 12,  null, null, 2,  1, 1),
      ('reserve', 6, 'Plinthes non jointées, hall',          null,                                              1, 9,   null, null, 4,  1, 0),
      ('reserve', 1, 'Seuil de porte à reprendre, local OM', null,                                              2, -20, null, null, 35, 2, 0),
      ('reserve', 2, 'Évacuation EP bouchée, terrasse A',    'Gravats dans la descente.',                       2, -9,  null, null, 16, 3, 0),
      ('reserve', 4, 'Éclairage de sécurité hors service',   'Bloc BAES cage B.',                               1, -1,  null, null, 10, 2, 0),
      -- Observations de visite
      ('observation', 1, 'Stockage des matériaux sous bâche', 'Sacs de ciment posés sur palettes, bâche à refixer côté nord.', 0, null, null, null, 6, 1, 2),
      ('observation', 1, 'Garde-corps provisoires posés, cage B', 'Conformes au plan de prévention.',            0, null, null, null, 6, 1, 1),
      ('observation', 2, 'Essai d''arrosage de la terrasse A', 'Essai de 48 h en cours, pas d''infiltration constatée à J+1.', 0, null, null, null, 2, 3, 1),
      ('observation', 3, 'Passage du bureau de contrôle',     'Visite des gaines palières, pas de remarque bloquante.',        0, null, null, null, 13, 2, 1),
      ('observation', 5, 'Livraison des portes palières',      '24 portes livrées, stockées au RDC bâtiment A.',                0, null, null, null, 12, 3, 1),
      ('observation', 6, 'Propreté des parties communes',      'Gravats à évacuer avant la pose du carrelage.',                 0, null, null, null, 1, 1, 1)
    ) as t(nature, lot, nom, note, st, due, debut, av, ago, who, nph)
  loop
    k := k + 1;
    v_status := case r.st when 2 then s_done when 1 then s_mid else s_todo end;
    -- Emplacement sur un des plans (les tâches de planning ne sont pas localisées).
    p := case when v_plan_ids is null or r.nature = 'tache' then null
              else 1 + (k % array_length(v_plan_ids, 1)) end;
    v_x := 0.15 + 0.7 * _demo_rand(p_project::text || r.nom || 'x');
    v_y := 0.15 + 0.7 * _demo_rand(p_project::text || r.nom || 'y');

    insert into pdf_pins (project_id, plan_id, pdf_name, x, y, name, note, type, category_id, status_id,
                          assigned_to, created_by, updated_by, due_date, date_debut, avancement,
                          created_at, updated_at)
    values (p_project,
            case when p is null then null else v_plan_ids[p] end,
            case when p is null then null else v_plan_names[p] end,
            case when p is null then null else v_x end,
            case when p is null then null else v_y end,
            r.nom, r.note, r.nature, v_lot[r.lot], v_status,
            case when r.nature = 'observation' then null else v_people[1 + r.who] end,
            v_people[1 + (k % 3)], v_people[1 + (k % 3)],
            case when r.due is null then null else ((d + r.due)::text || 'T12:00:00Z')::timestamptz end,
            case when r.debut is null then null else d + r.debut end,
            r.av,
            now() - make_interval(days => r.ago, hours => (k * 5) % 9),
            now() - make_interval(days => greatest(r.ago - 2, 0), hours => (k * 3) % 7))
    returning id into v_pin;

    -- Photos, prises dans la réserve de la démo.
    if v_nphotos > 0 and r.nph > 0 then
      for i in 1..r.nph loop
        insert into pins_photos (pin_id, project_id, sender_id, public_url, thumb_url, description, date, created_at,
                                 plan_id, plan_x, plan_y)
        select v_pin, p_project, v_people[1 + (k % 3)],
               v_photos -> ((k * 3 + i) % v_nphotos) ->> 'url',
               v_photos -> ((k * 3 + i) % v_nphotos) ->> 'thumb',
               case when i = 1 then r.nom else null end,
               now() - make_interval(days => r.ago), now() - make_interval(days => r.ago),
               case when p is null then null else v_plan_ids[p] end,
               case when p is null then null else v_x + 0.01 * i end,
               case when p is null then null else v_y end;
      end loop;
    end if;

    -- Quelques échanges sur les réserves en cours.
    if r.nature = 'reserve' and r.st = 1 then
      insert into comments (pin_id, sender_id, comment, created_at, username)
      select v_pin, v_people[2], 'Entreprise relancée, intervention prévue cette semaine.', now() - make_interval(days => greatest(r.ago - 1, 0)), name
        from members where id = v_people[2];
    end if;
    if r.nature = 'reserve' and r.st = 2 then
      insert into comments (pin_id, sender_id, comment, created_at, username)
      select v_pin, v_people[1], 'Levée constatée sur place.', now() - make_interval(days => greatest(r.ago - 3, 0)), name
        from members where id = v_people[1];
    end if;
  end loop;

  -- ── Réunions de chantier : n° 1 et n° 2 diffusées ──────────────────────────
  insert into meetings (id, project_id, numero, date, heure, lieu, objet, observations, prochaine_date, prochaine_heure,
                        statut, diffusee_at, created_by, created_at)
  values
    (v_m1, p_project, 1, d - 21, '10:00', 'Base vie du chantier', 'Réunion de chantier',
     'Démarrage des corps d''état techniques. Planning de l''étanchéité à confirmer.', d - 7, '10:00',
     'diffusee', now() - interval '20 days', p_admin, now() - interval '22 days'),
    (v_m2, p_project, 2, d - 7, '10:00', 'Base vie du chantier', 'Réunion de chantier',
     'L''étanchéité de la terrasse B accuse un retard de deux semaines : l''entreprise renforce son équipe.', d + 7, '10:00',
     'diffusee', now() - interval '6 days', p_admin, now() - interval '8 days');

  -- Présents
  insert into meeting_attendees (meeting_id, entreprise_id, nom, societe, presence, ordre)
  select m.id, e.id, e.contact_name, e.name,
         case when m.id = v_m2 and e.name = 'Déco Finitions Anfa' then 'excuse'
              when m.id = v_m1 and e.name = 'Clim Air Maroc' then 'absent' else 'present' end,
         row_number() over (partition by m.id order by e.name)
    from (values (v_m1), (v_m2)) as m(id), entreprises e
   where e.organization_id = p_org and e.id = any(v_ent);

  -- Avancement des lots à chaque réunion
  insert into meeting_lot_progress (meeting_id, lot_id, avancement)
  select v_m1, c.id, greatest(0, c.avancement - case when c.avancement >= 100 then 5 else 15 end)
    from categories c where c.project_id = p_project;
  insert into meeting_lot_progress (meeting_id, lot_id, avancement)
  select v_m2, c.id, greatest(0, c.avancement - case when c.avancement >= 100 then 0 else 5 end)
    from categories c where c.project_id = p_project;

  -- Points : ouverts en réunion 1 (dont trois soldés en réunion 2), puis en réunion 2.
  for r in
    select * from (values
      (1, v_m1, 2, 'Transmettre le planning détaillé de l''étanchéité',            -14, true),
      (2, v_m1, 3, 'Fournir les fiches techniques des appareils sanitaires',       -10, true),
      (3, v_m1, 4, 'Valider l''emplacement des tableaux d''étage avec le BET',     -7,  true),
      (4, v_m1, 5, 'Confirmer la date de livraison des menuiseries extérieures',   -5,  false),
      (5, v_m1, 1, 'Évacuer les gravats des parties communes',                     -3,  false),
      (6, v_m2, 2, 'Reprendre le relevé décollé de la terrasse B',                 3,   false),
      (7, v_m2, 6, 'Présenter les échantillons de carrelage au maître d''ouvrage', 7,   false),
      (8, v_m2, 3, 'Remplacer le raccord fuyard de la SDB A12',                    2,   false)
    ) as t(numero, meeting, lot, texte, echeance, clos)
  loop
    insert into meeting_points (project_id, numero, meeting_id, clos_meeting_id, lot_id, entreprise_id, type, texte,
                                echeance, statut, created_by)
    values (p_project, r.numero, r.meeting, case when r.clos then v_m2 else null end,
            v_lot[r.lot], v_ent[r.lot], 'action', r.texte, d + r.echeance,
            case when r.clos then 'clos' else 'ouvert' end, p_admin)
    returning id into v_pin;
    v_pt := v_pt || v_pin;
  end loop;
  insert into meeting_point_suivis (point_id, meeting_id, texte)
  values (v_pt[4], v_m2, 'Livraison décalée : l''entreprise annonce la semaine prochaine.'),
         (v_pt[5], v_m2, 'Partiellement fait, reste le hall du bâtiment B.');

  -- Journal d'activité : aux dates des éléments, pas à la date de la remise à zéro.
  update events e set created_at = p.created_at
    from pdf_pins p where e.pin_id = p.id and p.project_id = p_project;
  update events e set created_at = ph.created_at
    from pins_photos ph where e.pin_photo_id = ph.id and ph.project_id = p_project;

  select jsonb_build_object(
    'projet', (select name from projects where id = p_project),
    'plans', coalesce(array_length(v_plan_ids, 1), 0),
    'photos_disponibles', v_nphotos,
    'reserves', (select count(*) from pdf_pins where project_id = p_project and type = 'reserve'),
    'taches', (select count(*) from pdf_pins where project_id = p_project and type = 'tache'),
    'observations', (select count(*) from pdf_pins where project_id = p_project and type = 'observation'),
    'lots', array_length(v_lot, 1),
    'reunions', 2
  ) into v_counts;
  return v_counts;
end $$;

-- ── Remise à zéro ────────────────────────────────────────────────────────────
-- Appelable par un administrateur de l'organisation de démonstration (bandeau
-- de l'application), par le super-administrateur ou en SQL (rôle de service).
create or replace function public.reset_demo(p_org uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid;
  v_photos jsonb;
  v_result jsonb := '[]'::jsonb;
  v_project uuid;
begin
  if auth.uid() is not null and not (is_org_admin(p_org) or is_super_admin()) then
    raise exception 'Seul un administrateur de cette organisation peut réinitialiser la démonstration.' using errcode = '42501';
  end if;
  if not exists (select 1 from organizations where id = p_org and is_demo) then
    raise exception 'Cette organisation n''est pas une organisation de démonstration : rien n''a été effacé.';
  end if;

  -- Les éléments sont créés « par » un administrateur de la démo : l'appelant
  -- s'il en est un, sinon le premier administrateur.
  select m.id into v_admin
    from members m join members_organizations mo on mo.member_id = m.id
   where mo.organization_id = p_org and mo.role in ('admin', 'owner')
   order by (m.auth_id = auth.uid()) desc nulls last, m.created_at
   limit 1;
  if v_admin is null then
    raise exception 'L''organisation de démonstration n''a pas d''administrateur.';
  end if;

  perform set_config('zs.demo_reset', 'on', true);

  -- Équipe fictive (sans compte de connexion) : intervenants des éléments.
  insert into members (name, email, role, status, job_description, organization_id, invited)
  select t.name, t.email, t.role, 'active', t.job, p_org, false
    from (values
      ('Salma Idrissi',      'salma.idrissi@demo.zaynspace.com',    'Membres', 'Conductrice de travaux'),
      ('Youssef Benjelloun', 'youssef.benjelloun@demo.zaynspace.com', 'Membres', 'OPC'),
      ('Hamza Tazi',         'hamza.tazi@demo.zaynspace.com',       'Membres', 'Ingénieur structure'),
      ('Leila Chraibi',      'leila.chraibi@demo.zaynspace.com',    'guest',   'Bureau de contrôle')
    ) as t(name, email, role, job)
   where not exists (select 1 from members m where m.organization_id = p_org and m.email = t.email);
  insert into members_organizations (member_id, organization_id, role)
  select m.id, p_org, m.role from members m
   where m.organization_id = p_org and m.email like '%@demo.zaynspace.com'
     and not exists (select 1 from members_organizations mo where mo.member_id = m.id and mo.organization_id = p_org);
  insert into members_projects (member_id, project_id, role)
  select m.id, p.id, case when m.role = 'guest' then 'guest' else null end
    from members m cross join projects p
   where m.organization_id = p_org and p.organization_id = p_org and m.email like '%@demo.zaynspace.com'
     and not exists (select 1 from members_projects mp where mp.member_id = m.id and mp.project_id = p.id);

  -- Réserve de photos : celles d'avant la remise à zéro s'y ajoutent.
  select coalesce(jsonb_agg(distinct jsonb_build_object('url', ph.public_url, 'thumb', coalesce(ph.thumb_url, ph.public_url))), '[]'::jsonb)
    into v_photos
    from pins_photos ph join projects p on p.id = ph.project_id
   where p.organization_id = p_org and ph.deleted_at is null and ph.public_url is not null;
  update organizations o
     set demo_assets = jsonb_set(o.demo_assets, '{photos}', (
           select coalesce(jsonb_agg(x order by x ->> 'url'), '[]'::jsonb)
             from (select distinct x from jsonb_array_elements(coalesce(o.demo_assets -> 'photos', '[]'::jsonb) || v_photos) as x) s
         ))
   where o.id = p_org;

  perform _demo_clear(p_org);
  for v_project in select id from projects where organization_id = p_org order by created_at loop
    v_result := v_result || _demo_seed_project(p_org, v_project, v_admin);
  end loop;

  -- La démo commence sans notifications (les déclencheurs en ont créé pendant le scénario).
  delete from notifications
   where project_id in (select id from projects where organization_id = p_org);

  update organizations set demo_reset_at = now() where id = p_org;
  return jsonb_build_object('projets', v_result, 'reinitialisee_le', now());
end $$;

revoke all on function public._demo_clear(uuid) from public, anon, authenticated;
revoke all on function public._demo_seed_project(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.reset_demo(uuid) from public, anon;
grant execute on function public.reset_demo(uuid) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.reset_demo(uuid) to service_role;
  end if;
end $$;
