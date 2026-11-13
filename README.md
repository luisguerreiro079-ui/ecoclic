# ÉcoClic

Application web installable (PWA) de rappels de collecte des poubelles.
Commune pilote : Gournay-sur-Marne (93460), calendrier du SIETREM.

## Lancer l'appli sur ton ordinateur

Dans VS Code : **File → Open Folder** → `Documents\ecoclic`.
Puis **Terminal → New Terminal**, et tape :

```
npm install
```
(une seule fois, ça télécharge les outils : 1 à 3 minutes)

```
npm run dev
```
Ouvre ensuite **http://localhost:3000** dans ton navigateur.
Pour arrêter : clique dans le terminal et appuie sur **Ctrl + C**.

## Vérifier le calendrier

```
npm test
```
Cette commande :
1. contrôle automatiquement le moteur de calcul ;
2. affiche les collectes des 30 prochains jours, à comparer avec le calendrier du SIETREM ;
3. liste les collectes qui tombent un jour férié, à faire confirmer par le SIETREM.

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `docs/ARCHITECTURE.md` | Plan d'ensemble : modules, rôles, base de données, étapes |
| `lib/calendrier/donnees-gournay.js` | Règles de collecte du SIETREM et exceptions officielles |
| `lib/calendrier/moteur.js` | Calcul des dates de collecte à partir des règles |
| `lib/collectes.js` | Relie les données de Gournay au moteur, pour l'écran d'accueil |
| `lib/adresses.js` | Recherche d'adresse (Base Adresse Nationale) et secteur de collecte |
| `app/RechercheAdresse.js` | Bloc « Votre adresse » de l'écran d'accueil |
| `lib/supabase.js` | Connexion à la base Supabase (valeurs dans `.env.local`, modèle dans `.env.example`) |
| `app/compte/page.js` | Page « Mon compte » : connexion par lien reçu par e-mail |
| `supabase/migrations/` | Structure de la base de données (phase 1) |
| `supabase/seed.sql` | Données de départ de Gournay-sur-Marne pour la base |
| `app/page.js` | Écran d'accueil |
| `app/layout.js` | Cadre commun de l'appli (titre, icône) |
| `app/manifest.js` | Fiche d'installation sur téléphone |
| `public/sw.js` | Service worker (installation, puis notifications) |
| `scripts/test-collectes.js` | Vérification du calendrier |

## Règles du projet

- Les calendriers viennent uniquement de sources officielles (SIETREM).
- **Aucun décalage de jour férié sans confirmation officielle.**
  Les exceptions confirmées s'ajoutent dans `EXCEPTIONS` (`lib/calendrier/donnees-gournay.js`), avec leur source.
- Les signalements des habitants sont vérifiés avant toute modification.
- On développe la phase 1 (poubelles) jusqu'au bout avant de commencer les autres modules.

## Étapes suivantes

Le détail est dans `docs/ARCHITECTURE.md`.

1. ✅ Squelette de l'appli
2. ✅ Architecture, moteur de calendrier par règles, schéma de la base
3. Mise en ligne avec GitHub et Vercel
4. Création du projet Supabase, avec le schéma et les données de Gournay
5. ✅ Recherche d'adresse (Base Adresse Nationale) — l'adresse est gardée sur l'appareil en attendant les comptes
6. Comptes et réglages des rappels
7. Notifications et bouton « Poubelle sortie »
8. Espace administrateur et signalements
9. Campagne de vérification sur 20 à 30 adresses, RGPD, sauvegardes
