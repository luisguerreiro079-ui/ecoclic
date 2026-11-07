// Calendrier de collecte — Gournay-sur-Marne (source : SIETREM, sietrem.fr).
// Plus tard, ces règles viendront de la base de données (Supabase) et seront
// saisies depuis l'espace administrateur, avec leur source officielle.

export const COMMUNE = { nom: "Gournay-sur-Marne", codePostal: "93460", source: "SIETREM" };

export const POUBELLES = [
  { id: "om",    nom: "Ordures ménagères",     regle: "Mercredi et samedi",                    couleur: "#6b4a32" },
  { id: "emb",   nom: "Emballages et papiers", regle: "Jeudi",                                 couleur: "#d9a908" },
  { id: "verre", nom: "Verre",                 regle: "Jeudi des semaines impaires",           couleur: "#2c8a4f", aConfirmer: true },
  { id: "enc",   nom: "Encombrants",           regle: "4e vendredi du mois",                   couleur: "#566472" },
  { id: "vert",  nom: "Déchets verts",         regle: "1er et 3e lundis, d'avril à décembre", couleur: "#74a52b" },
];

// Exceptions officielles (jours fériés, décalages).
// RÈGLE : aucune exception automatique. On n'ajoute une ligne ici
// qu'après confirmation écrite du SIETREM.
// Exemple : { date: "2026-11-11", poubelle: "om", action: "annulee", source: "mail SIETREM du ..." }
export const EXCEPTIONS = [];

export function semaineIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - debutAnnee) / 864e5 + 1) / 7);
}

export function dateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Liste des poubelles collectées à une date donnée. */
export function collectesDuJour(d) {
  const jour = d.getDay(), rang = Math.ceil(d.getDate() / 7), mois = d.getMonth(), out = [];
  if (jour === 3 || jour === 6) out.push("om");
  if (jour === 4) { out.push("emb"); if (semaineIso(d) % 2 === 1) out.push("verre"); }
  if (jour === 5 && rang === 4) out.push("enc");
  if (jour === 1 && (rang === 1 || rang === 3) && mois >= 3) out.push("vert");
  const iso = dateIso(d);
  return out.filter(id => !EXCEPTIONS.some(e => e.date === iso && e.poubelle === id && e.action === "annulee"));
}

export const ajouterJours = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const minuit = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Prochaine date de collecte d'une poubelle, à partir d'aujourd'hui inclus. */
export function prochaineCollecte(id, depuis = new Date()) {
  const debut = minuit(depuis);
  for (let i = 0; i < 400; i++) {
    const d = ajouterJours(debut, i);
    if (collectesDuJour(d).includes(id)) return d;
  }
  return null;
}
