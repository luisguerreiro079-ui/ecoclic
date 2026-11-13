-- ============================================================================
-- ÉcoClic — données de départ : Gournay-sur-Marne (93460), collectes du SIETREM.
-- À lancer après supabase/migrations/0001_phase1_collectes.sql.
--
-- Le calendrier est créé au statut « a_verifier » : il ne sera visible du public
-- qu'après vérification et publication par un administrateur.
-- Ces lignes doivent rester identiques à lib/calendrier/donnees-gournay.js.
-- ============================================================================

insert into types_collecte (id, nom, couleur, ordre) values
  ('om',    'Ordures ménagères',     '#6b4a32', 1),
  ('emb',   'Emballages et papiers', '#d9a908', 2),
  ('verre', 'Verre',                 '#2c8a4f', 3),
  ('enc',   'Encombrants',           '#566472', 4),
  ('vert',  'Déchets verts',         '#74a52b', 5);

with commune as (
  insert into communes (nom, code_postal, code_insee, organisme_collecte, active)
  values ('Gournay-sur-Marne', '93460', '93033', 'SIETREM', true)
  returning id
), source as (
  insert into sources_officielles (commune_id, titre, url, nature)
  select id, 'SIETREM — Collecte à Gournay-sur-Marne',
         'https://www.sietrem.fr/collecte/collecte-gournay-sur-marne/', 'site'
  from commune
  returning id
), secteur as (
  -- Un seul secteur pour l'instant. À découper si le SIETREM distingue des rues.
  insert into secteurs (commune_id, nom, description)
  select id, 'Toute la commune', 'Secteur unique, à confirmer rue par rue' from commune
  returning id
), calendrier as (
  insert into calendriers (secteur_id, valable_du, valable_au, statut, source_id)
  select secteur.id, date '2026-01-01', date '2027-12-31', 'a_verifier', source.id
  from secteur, source
  returning id, source_id
)
insert into regles_collecte
  (calendrier_id, source_id, type_collecte_id, libelle, jours_semaine, rangs_mois, parite_semaine, mois, a_confirmer)
select c.id, c.source_id, r.type_collecte_id, r.libelle, r.jours_semaine, r.rangs_mois, r.parite_semaine, r.mois, r.a_confirmer
from calendrier c, (values
  ('om',    'Mercredi et samedi',                   '{3,6}'::smallint[], null::smallint[], null::text, null::smallint[],            false),
  ('emb',   'Jeudi',                                '{4}',               null,             null,       null,                        false),
  ('verre', 'Jeudi des semaines impaires',          '{4}',               null,             'impaire',  null,                        true),
  ('enc',   '4e vendredi du mois',                  '{5}',               '{4}',            null,       null,                        false),
  ('vert',  '1er et 3e lundis, d''avril à décembre', '{1}',               '{1,3}',          null,       '{4,5,6,7,8,9,10,11,12}',    false)
) as r (type_collecte_id, libelle, jours_semaine, rangs_mois, parite_semaine, mois, a_confirmer);
