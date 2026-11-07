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
Affiche les collectes des 30 prochains jours, à comparer avec le calendrier du SIETREM.

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `lib/collectes.js` | Règles de collecte du SIETREM et exceptions officielles |
| `app/page.js` | Écran d'accueil |
| `app/layout.js` | Cadre commun de l'appli (titre, icône) |
| `app/manifest.js` | Fiche d'installation sur téléphone |
| `public/sw.js` | Service worker (installation, puis notifications) |
| `scripts/test-collectes.js` | Vérification du calendrier |

## Règles du projet

- Les calendriers viennent uniquement de sources officielles (SIETREM).
- **Aucun décalage de jour férié sans confirmation officielle.**
  Les exceptions confirmées s'ajoutent dans `EXCEPTIONS` (`lib/collectes.js`), avec leur source.
- Les signalements des habitants sont vérifiés avant toute modification.

## Étapes suivantes

1. ✅ Squelette de l'appli (cette version)
2. Mise en ligne avec GitHub et Vercel
3. Base de données Supabase (communes, secteurs, règles, exceptions)
4. Recherche d'adresse (Base Adresse Nationale)
5. Comptes et réglages des rappels
6. Notifications et bouton « Poubelle sortie »
7. Espace administrateur et signalements
8. RGPD, sauvegardes
