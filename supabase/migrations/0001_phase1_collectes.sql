-- ============================================================================
-- ÉcoClic — Phase 1 : calendrier des poubelles, rappels, « Poubelle sortie »
-- À appliquer sur un projet Supabase (PostgreSQL). Voir docs/ARCHITECTURE.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Listes de valeurs
-- ---------------------------------------------------------------------------
create type role_utilisateur   as enum ('habitant', 'moderateur', 'admin', 'professionnel', 'commercant');
create type statut_calendrier  as enum ('brouillon', 'a_verifier', 'publie', 'archive');
create type statut_exception   as enum ('proposee', 'confirmee', 'rejetee');
create type action_exception   as enum ('annulee', 'ajoutee', 'reportee');
create type statut_signalement as enum ('nouveau', 'en_cours', 'corrige', 'sans_suite');
create type mode_rappel        as enum ('unique', 'trois', 'horaire');

-- ---------------------------------------------------------------------------
-- 2. Comptes et rôles
-- ---------------------------------------------------------------------------
create table profils (
  id       uuid primary key references auth.users (id) on delete cascade,
  role     role_utilisateur not null default 'habitant',
  prenom   text,
  cree_le  timestamptz not null default now()
);
comment on table profils is 'Un profil par compte. Le rôle ne peut être changé que par un administrateur.';

-- Crée automatiquement le profil à l''inscription.
create function creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profils (id) values (new.id);
  return new;
end $$;

create trigger a_l_inscription after insert on auth.users
  for each row execute function creer_profil();

-- Fonctions utilisées par les règles d''accès.
create function mon_role() returns role_utilisateur
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid()
$$;

create function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() = 'admin', false)
$$;

create function est_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role() in ('admin', 'moderateur'), false)
$$;

-- ---------------------------------------------------------------------------
-- 3. Communes, secteurs, rues
-- ---------------------------------------------------------------------------
create table communes (
  id                 uuid primary key default gen_random_uuid(),
  nom                text not null,
  code_postal        text not null,
  code_insee         text not null unique,
  organisme_collecte text,                        -- ex. SIETREM
  active             boolean not null default false,
  cree_le            timestamptz not null default now()
);

create table sources_officielles (
  id            uuid primary key default gen_random_uuid(),
  commune_id    uuid not null references communes (id) on delete cascade,
  titre         text not null,
  url           text,
  nature        text not null default 'site',     -- site, pdf, courrier, courriel, telephone
  date_document date,
  consulte_le   date not null default current_date,
  note          text
);
comment on table sources_officielles is 'D''où vient chaque information de calendrier. Obligatoire pour publier.';

create table secteurs (
  id          uuid primary key default gen_random_uuid(),
  commune_id  uuid not null references communes (id) on delete cascade,
  nom         text not null,
  description text,
  unique (commune_id, nom)
);

-- Rattache une rue (ou un tronçon de rue) à un secteur.
create table voies (
  id           uuid primary key default gen_random_uuid(),
  commune_id   uuid not null references communes (id) on delete cascade,
  secteur_id   uuid not null references secteurs (id) on delete cascade,
  nom          text not null,                     -- tel que dans la Base Adresse Nationale
  numero_debut integer,                           -- vide = toute la rue
  numero_fin   integer,
  cote         text not null default 'tous' check (cote in ('tous', 'pair', 'impair'))
);
create index voies_commune_nom on voies (commune_id, lower(nom));

-- ---------------------------------------------------------------------------
-- 4. Calendriers : des règles + des exceptions confirmées
-- ---------------------------------------------------------------------------
create table types_collecte (
  id      text primary key,                       -- om, emb, verre, enc, vert
  nom     text not null,
  couleur text not null,
  ordre   smallint not null default 0
);

create table calendriers (
  id          uuid primary key default gen_random_uuid(),
  secteur_id  uuid not null references secteurs (id) on delete cascade,
  valable_du  date not null,
  valable_au  date not null,
  statut      statut_calendrier not null default 'brouillon',
  source_id   uuid references sources_officielles (id),
  verifie_par uuid references profils (id),
  verifie_le  timestamptz,
  publie_le   timestamptz,
  check (valable_au >= valable_du),
  -- Fiabilité : impossible de publier sans source ni vérificateur.
  check (statut <> 'publie' or (source_id is not null and verifie_par is not null and verifie_le is not null))
);

create table regles_collecte (
  id               uuid primary key default gen_random_uuid(),
  calendrier_id    uuid not null references calendriers (id) on delete cascade,
  type_collecte_id text not null references types_collecte (id),
  libelle          text not null,                 -- texte affiché : « Mercredi et samedi »
  jours_semaine    smallint[] not null,           -- 1 = lundi … 7 = dimanche
  rangs_mois       smallint[],                    -- ex. {4} = 4e du mois ; vide = toutes les semaines
  parite_semaine   text check (parite_semaine in ('paire', 'impaire')),  -- numéro de semaine ISO
  mois             smallint[],                    -- ex. {4,…,12} ; vide = toute l''année
  heure_passage    text,                          -- ex. « à partir de 6 h »
  a_confirmer      boolean not null default false,
  source_id        uuid references sources_officielles (id)
);
create index regles_calendrier on regles_collecte (calendrier_id);

create table exceptions_collecte (
  id               uuid primary key default gen_random_uuid(),
  calendrier_id    uuid not null references calendriers (id) on delete cascade,
  type_collecte_id text not null references types_collecte (id),
  date_collecte    date not null,                 -- date concernée
  action           action_exception not null,
  date_report      date,                          -- nouvelle date si « reportee »
  statut           statut_exception not null default 'proposee',
  source_id        uuid references sources_officielles (id),
  motif            text,
  propose_par      uuid references profils (id),
  confirme_par     uuid references profils (id),
  confirme_le      timestamptz,
  check (action <> 'reportee' or date_report is not null),
  -- Aucune exception confirmée sans source officielle.
  check (statut <> 'confirmee' or (source_id is not null and confirme_par is not null))
);
create index exceptions_calendrier on exceptions_collecte (calendrier_id, date_collecte);

create table verifications (
  id            uuid primary key default gen_random_uuid(),
  calendrier_id uuid not null references calendriers (id) on delete cascade,
  fait_par      uuid references profils (id),
  fait_le       timestamptz not null default now(),
  resultat      text not null check (resultat in ('conforme', 'ecart')),
  commentaire   text
);
comment on table verifications is 'Historique des contrôles d''un calendrier (campagne des 20 à 30 adresses, contrôle annuel…).';

-- ---------------------------------------------------------------------------
-- 5. Côté habitant : adresses, poubelles, rappels
-- ---------------------------------------------------------------------------
create table adresses_utilisateur (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references profils (id) on delete cascade,
  libelle        text not null default 'Maison',
  adresse_texte  text not null,
  ban_id         text,                            -- identifiant Base Adresse Nationale
  commune_id     uuid not null references communes (id),
  secteur_id     uuid references secteurs (id),   -- vide = secteur non trouvé, à traiter
  cree_le        timestamptz not null default now()
);
create index adresses_utilisateur_idx on adresses_utilisateur (utilisateur_id);

-- Poubelles que l''habitant veut suivre à cette adresse.
create table adresse_types_collecte (
  adresse_id       uuid not null references adresses_utilisateur (id) on delete cascade,
  type_collecte_id text not null references types_collecte (id),
  primary key (adresse_id, type_collecte_id)
);

create table preferences_rappel (
  adresse_id  uuid primary key references adresses_utilisateur (id) on delete cascade,
  actif       boolean not null default true,
  la_veille   boolean not null default true,
  le_jour     boolean not null default false,
  mode        mode_rappel not null default 'unique',
  heures      time[] not null default '{19:00}',  -- modes « unique » et « trois »
  plage_debut time not null default '17:00',      -- mode « horaire » : toutes les heures…
  plage_fin   time not null default '22:00',      -- …jusqu''à confirmation
  check (plage_fin > plage_debut),
  check (cardinality(heures) between 1 and 3)
);

-- Téléphones et ordinateurs abonnés aux notifications (Web Push).
create table appareils (
  id              uuid primary key default gen_random_uuid(),
  utilisateur_id  uuid not null references profils (id) on delete cascade,
  endpoint        text not null unique,
  cle_p256dh      text not null,
  cle_auth        text not null,
  nom             text,
  consentement_le timestamptz not null default now(),
  actif           boolean not null default true
);

-- Empêche d''envoyer deux fois le même rappel.
create table rappels_envoyes (
  adresse_id       uuid not null references adresses_utilisateur (id) on delete cascade,
  type_collecte_id text not null references types_collecte (id),
  date_collecte    date not null,
  prevu_a          timestamptz not null,
  envoye_le        timestamptz not null default now(),
  primary key (adresse_id, type_collecte_id, date_collecte, prevu_a)
);

-- Bouton « Poubelle sortie » : arrête les rappels de cette collecte.
create table confirmations_sortie (
  adresse_id       uuid not null references adresses_utilisateur (id) on delete cascade,
  type_collecte_id text not null references types_collecte (id),
  date_collecte    date not null,
  confirme_le      timestamptz not null default now(),
  primary key (adresse_id, type_collecte_id, date_collecte)
);

-- ---------------------------------------------------------------------------
-- 6. Signalements et journal
-- ---------------------------------------------------------------------------
create table signalements (
  id               uuid primary key default gen_random_uuid(),
  utilisateur_id   uuid references profils (id) on delete set null,
  commune_id       uuid not null references communes (id),
  type_collecte_id text references types_collecte (id),
  adresse_texte    text,
  message          text not null,
  statut           statut_signalement not null default 'nouveau',
  traite_par       uuid references profils (id),
  reponse          text,
  cree_le          timestamptz not null default now()
);

create table journal_audit (
  id        bigint generated always as identity primary key,
  fait_par  uuid,
  fait_le   timestamptz not null default now(),
  table_nom text not null,
  operation text not null,
  ligne_id  text,
  avant     jsonb,
  apres     jsonb
);

create function journaliser() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into journal_audit (fait_par, table_nom, operation, ligne_id, avant, apres)
  values (
    auth.uid(), tg_table_name, tg_op,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger journal_calendriers after insert or update or delete on calendriers
  for each row execute function journaliser();
create trigger journal_regles after insert or update or delete on regles_collecte
  for each row execute function journaliser();
create trigger journal_exceptions after insert or update or delete on exceptions_collecte
  for each row execute function journaliser();
create trigger journal_profils after update on profils
  for each row execute function journaliser();

-- ---------------------------------------------------------------------------
-- 7. Règles d''accès (Row Level Security)
-- ---------------------------------------------------------------------------
alter table profils                enable row level security;
alter table communes               enable row level security;
alter table sources_officielles    enable row level security;
alter table secteurs               enable row level security;
alter table voies                  enable row level security;
alter table types_collecte         enable row level security;
alter table calendriers            enable row level security;
alter table regles_collecte        enable row level security;
alter table exceptions_collecte    enable row level security;
alter table verifications          enable row level security;
alter table adresses_utilisateur   enable row level security;
alter table adresse_types_collecte enable row level security;
alter table preferences_rappel     enable row level security;
alter table appareils              enable row level security;
alter table rappels_envoyes        enable row level security;
alter table confirmations_sortie   enable row level security;
alter table signalements           enable row level security;
alter table journal_audit          enable row level security;

-- Profils : chacun voit le sien ; seul un admin change un rôle.
create policy profils_lecture on profils for select
  using (id = auth.uid() or est_equipe());
create policy profils_modif_soi on profils for update
  using (id = auth.uid()) with check (id = auth.uid() and role = mon_role());
create policy profils_admin on profils for all
  using (est_admin()) with check (est_admin());

-- Référentiel public (lecture pour tous, écriture admin).
create policy communes_lecture on communes for select using (active or est_equipe());
create policy communes_admin   on communes for all using (est_admin()) with check (est_admin());

create policy secteurs_lecture on secteurs for select using (true);
create policy secteurs_admin   on secteurs for all using (est_admin()) with check (est_admin());

create policy voies_lecture on voies for select using (true);
create policy voies_admin   on voies for all using (est_admin()) with check (est_admin());

create policy types_lecture on types_collecte for select using (true);
create policy types_admin   on types_collecte for all using (est_admin()) with check (est_admin());

create policy sources_lecture on sources_officielles for select using (true);
create policy sources_equipe  on sources_officielles for all using (est_equipe()) with check (est_equipe());

-- Calendriers : le public ne voit que ce qui est publié.
create policy calendriers_lecture on calendriers for select
  using (statut = 'publie' or est_equipe());
create policy calendriers_admin on calendriers for all
  using (est_admin()) with check (est_admin());

create policy regles_lecture on regles_collecte for select
  using (est_equipe() or exists (
    select 1 from calendriers c where c.id = calendrier_id and c.statut = 'publie'));
create policy regles_admin on regles_collecte for all
  using (est_admin()) with check (est_admin());

-- Exceptions : le public ne voit que les exceptions confirmées.
create policy exceptions_lecture on exceptions_collecte for select
  using (est_equipe() or (statut = 'confirmee' and exists (
    select 1 from calendriers c where c.id = calendrier_id and c.statut = 'publie')));
-- Un modérateur peut proposer, jamais confirmer.
create policy exceptions_proposer on exceptions_collecte for insert
  with check (est_equipe() and statut = 'proposee' and propose_par = auth.uid());
create policy exceptions_admin on exceptions_collecte for all
  using (est_admin()) with check (est_admin());

create policy verifications_equipe on verifications for all
  using (est_equipe()) with check (est_equipe());

-- Données personnelles : chacun les siennes, personne d''autre.
create policy adresses_soi on adresses_utilisateur for all
  using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

create function adresse_est_a_moi(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from adresses_utilisateur where id = a and utilisateur_id = auth.uid())
$$;

create policy adresse_types_soi on adresse_types_collecte for all
  using (adresse_est_a_moi(adresse_id)) with check (adresse_est_a_moi(adresse_id));
create policy preferences_soi on preferences_rappel for all
  using (adresse_est_a_moi(adresse_id)) with check (adresse_est_a_moi(adresse_id));
create policy confirmations_soi on confirmations_sortie for all
  using (adresse_est_a_moi(adresse_id)) with check (adresse_est_a_moi(adresse_id));
create policy rappels_soi on rappels_envoyes for select
  using (adresse_est_a_moi(adresse_id));   -- l''écriture est réservée au serveur d''envoi

create policy appareils_soi on appareils for all
  using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

-- Signalements : tout le monde peut en envoyer, l''équipe les traite.
create policy signalements_envoi on signalements for insert
  with check (statut = 'nouveau' and (utilisateur_id is null or utilisateur_id = auth.uid()));
create policy signalements_lecture on signalements for select
  using (utilisateur_id = auth.uid() or est_equipe());
create policy signalements_equipe on signalements for update
  using (est_equipe()) with check (est_equipe());

create policy journal_admin on journal_audit for select using (est_admin());
