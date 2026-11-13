// Lecture des calendriers dans la base Supabase.
// - chargerCalendrierPublie : pour l'écran d'accueil (tout le monde, calendriers publiés seulement).
// - chargerCalendriersAdmin : pour l'espace administrateur (tous les statuts).
// Les droits sont contrôlés dans la base : un visiteur ne reçoit jamais un calendrier non publié.

import { supabase } from "../supabase.js";
import { dateIso } from "./moteur.js";

const CHAMPS = `
  id, statut, valable_du, valable_au, verifie_le, publie_le,
  secteur:secteurs ( id, nom, commune:communes ( nom, code_insee ) ),
  source:sources_officielles ( titre, url ),
  regles:regles_collecte ( id, type_collecte_id, libelle, jours_semaine, rangs_mois, parite_semaine, mois, a_confirmer ),
  exceptions:exceptions_collecte ( id, type_collecte_id, date_collecte, action, date_report, statut, motif )
`;

/**
 * Calendrier publié et valable aujourd'hui pour une commune.
 * Renvoie { types, regles, exceptions, verifieLe } ou null s'il n'y en a pas
 * (dans ce cas, l'appli utilise les règles de ses fichiers).
 */
export async function chargerCalendrierPublie(codeInsee, aujourdhui = new Date()) {
  if (!supabase) return null;
  const [cal, types] = await Promise.all([
    supabase.from("calendriers").select(CHAMPS).eq("statut", "publie"),
    supabase.from("types_collecte").select("id, nom, couleur, ordre").order("ordre"),
  ]);
  if (cal.error || types.error) return null;
  const jour = dateIso(aujourdhui);
  const trouve = cal.data.find(c =>
    c.secteur?.commune?.code_insee === codeInsee && c.valable_du <= jour && jour <= c.valable_au);
  if (!trouve || !trouve.regles.length) return null;
  return {
    types: types.data,
    regles: trouve.regles,
    exceptions: trouve.exceptions,
    verifieLe: trouve.verifie_le,
  };
}

/** Tous les calendriers, avec leurs règles (réservé à l'équipe par les règles d'accès). */
export async function chargerCalendriersAdmin() {
  const [cal, types] = await Promise.all([
    supabase.from("calendriers").select(CHAMPS).order("valable_du"),
    supabase.from("types_collecte").select("id, nom, couleur, ordre").order("ordre"),
  ]);
  if (cal.error) throw cal.error;
  if (types.error) throw types.error;
  return { calendriers: cal.data, types: types.data };
}
