// Calendrier de collecte utilisé par l'écran d'accueil — Gournay-sur-Marne.
// Ce fichier relie les données de la commune (lib/calendrier/donnees-gournay.js)
// au moteur de calcul (lib/calendrier/moteur.js).
// Si un calendrier publié existe dans la base (Supabase), l'écran d'accueil l'utilise
// à la place : voir lib/calendrier/base.js. Le moteur, lui, ne change pas.

import { COMMUNE, TYPES_COLLECTE, REGLES, EXCEPTIONS } from "./calendrier/donnees-gournay.js";
import * as moteur from "./calendrier/moteur.js";

export { COMMUNE, EXCEPTIONS };
export { ajouterJours, minuit, dateIso, semaineIso } from "./calendrier/moteur.js";

/** Les poubelles, avec leur règle en clair, pour l'affichage. */
export function construirePoubelles(types, regles) {
  return types.map(t => {
    const siennes = regles.filter(r => r.type_collecte_id === t.id);
    return {
      ...t,
      regle: siennes.map(r => r.libelle).join(" ; "),
      aConfirmer: siennes.some(r => r.a_confirmer),
    };
  }).filter(p => p.regle);
}

export const POUBELLES = construirePoubelles(TYPES_COLLECTE, REGLES);

/** Calendrier des fichiers de l'appli : utilisé tant que la base n'a rien de publié. */
export const CALENDRIER_LOCAL = {
  poubelles: POUBELLES, regles: REGLES, exceptions: EXCEPTIONS, verifieLe: null,
};

/** Liste des poubelles collectées à une date donnée (calendrier des fichiers). */
export const collectesDuJour = d => moteur.collectesDuJour(d, REGLES, EXCEPTIONS);

/** Prochaine date de collecte d'une poubelle, à partir d'aujourd'hui inclus (calendrier des fichiers). */
export const prochaineCollecte = (id, depuis = new Date()) =>
  moteur.prochaineCollecte(id, REGLES, EXCEPTIONS, depuis);
