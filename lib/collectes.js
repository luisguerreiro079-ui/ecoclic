// Calendrier de collecte utilisé par l'écran d'accueil — Gournay-sur-Marne.
// Ce fichier relie les données de la commune (lib/calendrier/donnees-gournay.js)
// au moteur de calcul (lib/calendrier/moteur.js).
// Plus tard, les données viendront de la base (Supabase) ; le moteur ne changera pas.

import { COMMUNE, TYPES_COLLECTE, REGLES, EXCEPTIONS } from "./calendrier/donnees-gournay.js";
import * as moteur from "./calendrier/moteur.js";

export { COMMUNE, EXCEPTIONS };
export { ajouterJours, minuit, dateIso, semaineIso } from "./calendrier/moteur.js";

/** Les poubelles, avec leur règle en clair, pour l'affichage. */
export const POUBELLES = TYPES_COLLECTE.map(t => {
  const regles = REGLES.filter(r => r.type_collecte_id === t.id);
  return {
    ...t,
    regle: regles.map(r => r.libelle).join(" ; "),
    aConfirmer: regles.some(r => r.a_confirmer),
  };
});

/** Liste des poubelles collectées à une date donnée. */
export const collectesDuJour = d => moteur.collectesDuJour(d, REGLES, EXCEPTIONS);

/** Prochaine date de collecte d'une poubelle, à partir d'aujourd'hui inclus. */
export const prochaineCollecte = (id, depuis = new Date()) =>
  moteur.prochaineCollecte(id, REGLES, EXCEPTIONS, depuis);
