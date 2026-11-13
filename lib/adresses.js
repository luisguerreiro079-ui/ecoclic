// Recherche d'adresse avec la Base Adresse Nationale (service public gratuit de l'État,
// géocodage de la Géoplateforme IGN : https://data.geopf.fr/geocodage).
// La recherche est limitée à la commune couverte par ÉcoClic.

import { COMMUNE, SECTEURS } from "./calendrier/donnees-gournay.js";

const SERVICE = "https://data.geopf.fr/geocodage/search";
const CLE_STOCKAGE = "ecoclic.adresse";

/** Cherche des adresses dans la commune. Renvoie au plus 5 propositions. */
export async function chercherAdresses(texte, { signal } = {}) {
  const q = texte.trim();
  if (q.length < 3) return [];
  const url = `${SERVICE}?${new URLSearchParams({
    q, citycode: COMMUNE.codeInsee, index: "address", limit: "5", autocomplete: "1",
  })}`;
  const reponse = await fetch(url, { signal });
  if (!reponse.ok) throw new Error(`Service d'adresses indisponible (${reponse.status})`);
  const donnees = await reponse.json();
  return (donnees.features || [])
    .map(f => f.properties)
    .filter(p => p.citycode === COMMUNE.codeInsee)
    .map(p => ({
      banId: p.id,
      texte: p.label,
      voie: p.street || p.name,
      numero: p.housenumber || null,
      precise: p.type === "housenumber",   // faux = seulement la rue, sans numéro
    }));
}

/**
 * Secteur de collecte d'une adresse.
 * Aujourd'hui, toute la commune est dans le même secteur. Quand il y en aura plusieurs,
 * c'est ici qu'on cherchera la rue et le numéro dans la table « voies ».
 */
export function secteurPour(adresse) {
  return adresse ? SECTEURS[0] : null;
}

// L'adresse choisie est gardée sur l'appareil (pas de compte pour l'instant).
export function lireAdresseEnregistree() {
  try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || null; } catch { return null; }
}
export function enregistrerAdresse(adresse) {
  try {
    if (adresse) localStorage.setItem(CLE_STOCKAGE, JSON.stringify(adresse));
    else localStorage.removeItem(CLE_STOCKAGE);
  } catch { /* stockage refusé (navigation privée) : l'adresse reste le temps de la visite */ }
}
