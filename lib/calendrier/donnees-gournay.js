// Données de Gournay-sur-Marne (source : SIETREM, sietrem.fr).
// Elles sont rangées comme les lignes de la base (voir supabase/seed.sql) :
// le jour où Supabase sera branché, ce fichier sera remplacé par une lecture de la base.
//
// Jours de la semaine : 1 = lundi, 2 = mardi, 3 = mercredi, 4 = jeudi,
//                       5 = vendredi, 6 = samedi, 7 = dimanche.

export const COMMUNE = { nom: "Gournay-sur-Marne", codePostal: "93460", codeInsee: "93033", source: "SIETREM" };

// Secteurs de collecte. Un seul pour l'instant : toute la commune a le même calendrier.
// Si le SIETREM distingue des rues, on ajoutera ici les secteurs et leurs rues.
export const SECTEURS = [{ id: "commune", nom: "Toute la commune" }];

export const TYPES_COLLECTE = [
  { id: "om",    nom: "Ordures ménagères",     couleur: "#6b4a32" },
  { id: "emb",   nom: "Emballages et papiers", couleur: "#d9a908" },
  { id: "verre", nom: "Verre",                 couleur: "#2c8a4f" },
  { id: "enc",   nom: "Encombrants",           couleur: "#566472" },
  { id: "vert",  nom: "Déchets verts",         couleur: "#74a52b" },
];

export const REGLES = [
  { type_collecte_id: "om",    libelle: "Mercredi et samedi",
    jours_semaine: [3, 6] },
  { type_collecte_id: "emb",   libelle: "Jeudi",
    jours_semaine: [4] },
  { type_collecte_id: "verre", libelle: "Jeudi des semaines impaires",
    jours_semaine: [4], parite_semaine: "impaire", a_confirmer: true },
  { type_collecte_id: "enc",   libelle: "4e vendredi du mois",
    jours_semaine: [5], rangs_mois: [4] },
  { type_collecte_id: "vert",  libelle: "1er et 3e lundis, d'avril à décembre",
    jours_semaine: [1], rangs_mois: [1, 3], mois: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

// Exceptions officielles (jours fériés, décalages).
// RÈGLE : aucune exception automatique. On n'ajoute une ligne ici qu'après
// confirmation écrite du SIETREM, avec le statut "confirmee" et la source.
// Exemples :
//   { type_collecte_id: "om", date_collecte: "2026-12-25", action: "annulee",
//     statut: "confirmee", source: "courriel SIETREM du ..." }
//   { type_collecte_id: "emb", date_collecte: "2027-05-13", action: "reportee",
//     date_report: "2027-05-14", statut: "confirmee", source: "..." }
export const EXCEPTIONS = [];
