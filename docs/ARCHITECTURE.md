# Architecture d'ÉcoClic

Ce document traduit le cahier des charges V3 (novembre 2026) en organisation technique.
Il sert de référence : chaque nouveau module doit s'y ranger sans casser l'existant.

## 1. Principe général

```
 Téléphone / ordinateur (PWA Next.js)
        │  lit les calendriers publiés, gère le compte
        ▼
 Supabase  ─ PostgreSQL (données + règles d'accès RLS)
           ─ Auth (comptes)
           ─ pg_cron (tâche toutes les 15 min)  ──►  envoi des rappels Web Push
        ▲
        │  saisit, vérifie, publie
 Espace administrateur (pages /admin de la même appli)
```

- **Une seule appli Next.js**, hébergée sur Vercel, pour les habitants et pour l'administration.
- **Supabase** stocke tout. Les droits sont contrôlés *dans la base* (Row Level Security),
  pas seulement dans l'interface : même un petit bug d'écran ne peut pas ouvrir les données d'autrui.
- **Le calendrier est stocké sous forme de règles**, pas de liste de dates :
  « mercredi et samedi », « jeudi des semaines impaires », « 4e vendredi du mois »…
  Les exceptions (jours fériés, décalages) sont des lignes à part, **appliquées seulement
  une fois confirmées**, avec leur source.
- Le même **moteur de calendrier** (`lib/calendrier/moteur.js`) calcule les dates partout :
  écran d'accueil, envoi des rappels, outil de vérification. Une seule logique = pas de divergence.

## 2. Modules

Chaque module a ses propres tables et ses propres pages. Les modules ne se lisent pas
directement entre eux, sauf via les comptes (`profils`) et les communes.

| Module | Phase | Tables principales | Pages |
|---|---|---|---|
| **Collectes** (calendrier, rappels, « Poubelle sortie ») | 1 | `communes`, `secteurs`, `voies`, `calendriers`, `regles_collecte`, `exceptions_collecte`, `preferences_rappel`, `confirmations_sortie` | `/`, `/compte`, `/admin/communes` |
| **Comptes et rôles** | 1 | `profils`, `journal_audit` | `/connexion`, `/admin/utilisateurs` |
| **Signalements** | 1 | `signalements` | `/signaler`, `/admin/signalements` |
| Annonces (dons, rachat) | 2 | `annonces`, `photos_annonce`, `offres` | `/annonces` |
| Professionnels | 2 | `professionnels`, `justificatifs`, `prestations`, `evaluations` | `/pro` |
| Paiements (Stripe Connect, 10 %) | 2 | `transactions`, `remboursements` | — |
| ÉcoPoints (max 5 % de réduction) | 3 | `ecopoints_mouvements`, `bareme_ecopoints` | — |
| Carte | 3 | (lit les annonces et professionnels) | `/carte` |
| Commerçants partenaires | 4 | `commercants`, `offres_commercants`, `utilisations_offre` | `/partenaires` |

Seules les tables de la phase 1 existent pour l'instant (voir `supabase/migrations/`).
Les rôles des phases suivantes sont déjà prévus dans la liste des rôles pour ne pas
avoir à modifier la structure des comptes plus tard.

## 3. Rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| Visiteur (non connecté) | Voir les calendriers **publiés** d'une commune, chercher une adresse |
| `habitant` | Enregistrer ses adresses, ses poubelles, ses rappels ; confirmer « Poubelle sortie » ; signaler une erreur |
| `moderateur` | Traiter les signalements, proposer des exceptions (sans les publier) |
| `admin` | Tout : communes, secteurs, calendriers, publication, comptes |
| `professionnel` | Phase 2 — profil pro, devis, prestations |
| `commercant` | Phase 4 — offres partenaires |

Règle clé : **un calendrier n'est visible du public que s'il a le statut `publie`**,
et il ne peut être publié que par un administrateur, qui est enregistré comme vérificateur.

## 4. Fiabilité des calendriers

Cycle de vie d'un calendrier : `brouillon` → `a_verifier` → `publie` → `archive`.

- Chaque calendrier, règle et exception est rattaché à une **source officielle** (`sources_officielles`).
- Une règle peut être marquée `a_confirmer` : elle s'affiche avec la mention « à confirmer ».
- Une exception a le statut `proposee`, `confirmee` ou `rejetee`.
  **Seules les exceptions `confirmee` modifient les dates.**
- Les jours fériés ne décalent **jamais** une collecte automatiquement.
  L'outil `npm test` liste simplement les collectes qui tombent un jour férié,
  pour qu'on demande la confirmation au SIETREM.
- Toute action sensible (publication, modification de règle, changement de rôle)
  est enregistrée dans `journal_audit`.

## 5. Données qui doivent venir de sources officielles

| Donnée | Source |
|---|---|
| Jours de collecte, secteurs, exceptions | SIETREM (sietrem.fr, courriers, réponses écrites) |
| Adresses, rues, code INSEE | Base Adresse Nationale, via le géocodage de la Géoplateforme IGN (data.geopf.fr/geocodage), gratuit |
| Jours fériés | Calculés (Code du travail), mais leur effet sur les collectes doit être confirmé par le SIETREM |
| SIRET des professionnels (phase 2) | API Recherche d'entreprises (data.gouv.fr) |

L'IA peut aider à lire un calendrier PDF, mais le résultat entre toujours en `brouillon`.

## 6. Rappels et notifications

- **Web Push** via le service worker (`public/sw.js`), avec un bouton « Poubelle sortie »
  directement dans la notification.
- **Contraintes connues** :
  - Sur iPhone, les notifications ne marchent que si l'appli a été **ajoutée à l'écran
    d'accueil** (iOS 16.4 ou plus récent). L'appli devra l'expliquer simplement.
  - Les tâches planifiées de Vercel en offre gratuite ne tournent qu'une fois par jour :
    insuffisant pour des rappels à 17 h, 19 h, 21 h ou toutes les heures.
    → On utilisera **pg_cron de Supabase** (toutes les 15 minutes), qui appelle la fonction d'envoi.
- **Solution de secours** prévue : rappel par e-mail pour les appareils sans Web Push.
- L'envoi est **idempotent** : la table `rappels_envoyes` empêche d'envoyer deux fois le même rappel,
  et une ligne dans `confirmations_sortie` arrête les rappels de cette collecte.

## 7. Données personnelles (RGPD)

- On ne stocke que ce qui sert : adresse, poubelles, préférences, appareils de notification.
- Les adresses exactes ne sont **jamais** visibles par d'autres utilisateurs.
- Consentement explicite et révocable pour les notifications.
- Suppression du compte = suppression des adresses, préférences et appareils (`on delete cascade`).

## 8. Organisation des fichiers

```
app/                     pages (Next.js)
lib/calendrier/          moteur de calcul des collectes (indépendant de Supabase)
lib/collectes.js         calendrier de Gournay utilisé par l'écran d'accueil
supabase/migrations/     structure de la base, numérotée dans l'ordre
supabase/seed.sql        données de départ : Gournay-sur-Marne
scripts/                 outils de vérification
docs/                    documentation
```

Tant que Supabase n'est pas branché, l'écran d'accueil lit les règles de
`lib/calendrier/donnees-gournay.js`, rangées **exactement comme les lignes de la base**.
Le jour du branchement, seule la source des données change, pas le moteur.

## 9. Ordre de développement de la phase 1

1. ✅ Squelette PWA
2. ✅ Moteur de calendrier par règles + schéma de base (cette étape)
3. Mise en ligne : GitHub + Vercel
4. Création du projet Supabase, application du schéma et des données de Gournay
5. ✅ Recherche d'adresse (BAN) et affectation au secteur (secteur unique pour l'instant)
6. Comptes, adresses, choix des poubelles et des rappels
7. Notifications Web Push + bouton « Poubelle sortie »
8. Espace administrateur : calendriers, exceptions, publication, signalements
9. Campagne de vérification sur 20 à 30 adresses de Gournay
