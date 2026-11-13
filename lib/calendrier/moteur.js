// Moteur de calendrier d'ÉcoClic.
// Il calcule les collectes d'un jour à partir de RÈGLES et d'EXCEPTIONS rangées
// exactement comme dans la base (tables regles_collecte et exceptions_collecte).
// Il ne dépend ni de Supabase ni de Next.js : on peut l'utiliser partout
// (écran d'accueil, envoi des rappels, outils de vérification).

export const ajouterJours = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const minuit = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function dateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Numéro de semaine ISO (celui des calendriers français). */
export function semaineIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - debutAnnee) / 864e5 + 1) / 7);
}

/** Jour de la semaine façon base de données : 1 = lundi … 7 = dimanche. */
export const jourSemaine = d => d.getDay() || 7;

/** Rang du jour dans le mois : 1 = 1er lundi, 2 = 2e lundi, etc. */
export const rangDansLeMois = d => Math.ceil(d.getDate() / 7);

/** Une règle s'applique-t-elle à cette date ? */
export function regleSApplique(regle, d) {
  if (!regle.jours_semaine.includes(jourSemaine(d))) return false;
  if (regle.rangs_mois?.length && !regle.rangs_mois.includes(rangDansLeMois(d))) return false;
  if (regle.mois?.length && !regle.mois.includes(d.getMonth() + 1)) return false;
  if (regle.parite_semaine) {
    const impaire = semaineIso(d) % 2 === 1;
    if ((regle.parite_semaine === "impaire") !== impaire) return false;
  }
  return true;
}

/**
 * Types de collecte ramassés à une date.
 * Seules les exceptions au statut « confirmee » sont prises en compte :
 * une exception proposée ou rejetée ne change rien.
 */
export function collectesDuJour(d, regles, exceptions = []) {
  const iso = dateIso(d);
  const confirmees = exceptions.filter(e => e.statut === "confirmee");
  const types = [];
  const ajouter = id => { if (!types.includes(id)) types.push(id); };

  for (const r of regles) {
    if (!regleSApplique(r, d)) continue;
    const supprimee = confirmees.some(e =>
      e.type_collecte_id === r.type_collecte_id && e.date_collecte === iso &&
      (e.action === "annulee" || e.action === "reportee"));
    if (!supprimee) ajouter(r.type_collecte_id);
  }
  for (const e of confirmees) {
    if (e.action === "ajoutee" && e.date_collecte === iso) ajouter(e.type_collecte_id);
    if (e.action === "reportee" && e.date_report === iso) ajouter(e.type_collecte_id);
  }
  return types;
}

/** Prochaine date de collecte d'un type, à partir d'aujourd'hui inclus. */
export function prochaineCollecte(type, regles, exceptions = [], depuis = new Date()) {
  const debut = minuit(depuis);
  for (let i = 0; i < 400; i++) {
    const d = ajouterJours(debut, i);
    if (collectesDuJour(d, regles, exceptions).includes(type)) return d;
  }
  return null;
}

/**
 * Jours fériés français d'une année (métropole).
 * ATTENTION : cette liste sert uniquement à REPÉRER les collectes à faire confirmer.
 * Elle ne décale jamais une collecte toute seule.
 */
export function joursFeries(annee) {
  // Dimanche de Pâques (algorithme de Meeus).
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const moisP = Math.floor((h + l - 7 * m + 114) / 31), jourP = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(annee, moisP - 1, jourP);

  const fixe = (mois, jour, nom) => ({ date: dateIso(new Date(annee, mois - 1, jour)), nom });
  const mobile = (n, nom) => ({ date: dateIso(ajouterJours(paques, n)), nom });
  return [
    fixe(1, 1, "Jour de l'an"), mobile(1, "Lundi de Pâques"), fixe(5, 1, "Fête du travail"),
    fixe(5, 8, "Victoire 1945"), mobile(39, "Ascension"), mobile(50, "Lundi de Pentecôte"),
    fixe(7, 14, "Fête nationale"), fixe(8, 15, "Assomption"), fixe(11, 1, "Toussaint"),
    fixe(11, 11, "Armistice 1918"), fixe(12, 25, "Noël"),
  ];
}
