// Vérification du calendrier : npm test
// 1. Contrôles automatiques du moteur de calcul.
// 2. Collectes des 30 prochains jours, à comparer avec le calendrier du SIETREM.
// 3. Collectes qui tombent un jour férié : à faire confirmer par le SIETREM.
import assert from "node:assert/strict";
import { collectesDuJour, ajouterJours, minuit, POUBELLES } from "../lib/collectes.js";
import * as moteur from "../lib/calendrier/moteur.js";
import { REGLES } from "../lib/calendrier/donnees-gournay.js";

// ---------- 1. Contrôles automatiques ----------
const jour = (a, m, j) => new Date(a, m - 1, j);

// Ancien calcul (version du 7 novembre), gardé ici comme référence.
function reference(d) {
  const j = d.getDay(), rang = Math.ceil(d.getDate() / 7), mois = d.getMonth(), out = [];
  if (j === 3 || j === 6) out.push("om");
  if (j === 4) { out.push("emb"); if (moteur.semaineIso(d) % 2 === 1) out.push("verre"); }
  if (j === 5 && rang === 4) out.push("enc");
  if (j === 1 && (rang === 1 || rang === 3) && mois >= 3) out.push("vert");
  return out;
}
// Le nouveau moteur doit donner exactement le même résultat, jour par jour, sur 3 ans.
for (let i = 0; i < 1096; i++) {
  const d = ajouterJours(jour(2026, 1, 1), i);
  assert.deepEqual(collectesDuJour(d), reference(d), `Écart le ${moteur.dateIso(d)}`);
}

// Quelques dates connues.
assert.deepEqual(collectesDuJour(jour(2026, 11, 18)), ["om"]);        // mercredi
assert.deepEqual(collectesDuJour(jour(2026, 11, 19)), ["emb", "verre"]); // jeudi, semaine 47
assert.deepEqual(collectesDuJour(jour(2026, 11, 26)), ["emb"]);       // jeudi, semaine 48
assert.deepEqual(collectesDuJour(jour(2026, 11, 27)), ["enc"]);       // 4e vendredi
assert.deepEqual(collectesDuJour(jour(2026, 12, 7)), ["vert"]);       // 1er lundi de décembre
assert.deepEqual(collectesDuJour(jour(2027, 1, 4)), []);              // lundi de janvier : pas de déchets verts

// Exceptions : seules les exceptions confirmées comptent.
const mer = jour(2026, 11, 18), jeu = jour(2026, 11, 19);
const ex = (action, statut, extra = {}) =>
  [{ type_collecte_id: "om", date_collecte: "2026-11-18", action, statut, ...extra }];
assert.deepEqual(moteur.collectesDuJour(mer, REGLES, ex("annulee", "proposee")), ["om"]);
assert.deepEqual(moteur.collectesDuJour(mer, REGLES, ex("annulee", "rejetee")), ["om"]);
assert.deepEqual(moteur.collectesDuJour(mer, REGLES, ex("annulee", "confirmee")), []);
const report = ex("reportee", "confirmee", { date_report: "2026-11-19" });
assert.deepEqual(moteur.collectesDuJour(mer, REGLES, report), []);
assert.deepEqual(moteur.collectesDuJour(jeu, REGLES, report), ["emb", "verre", "om"]);
const ajout = [{ type_collecte_id: "enc", date_collecte: "2026-11-17", action: "ajoutee", statut: "confirmee" }];
assert.deepEqual(moteur.collectesDuJour(jour(2026, 11, 17), REGLES, ajout), ["enc"]);

// Jours fériés mobiles.
const feries2027 = moteur.joursFeries(2027).map(f => f.date);
assert.ok(feries2027.includes("2027-03-29"));  // lundi de Pâques 2027
assert.ok(feries2027.includes("2027-05-06"));  // Ascension 2027
assert.ok(feries2027.includes("2027-05-17"));  // lundi de Pentecôte 2027

console.log("✔ Contrôles automatiques du moteur : tout est correct.\n");

// ---------- 2. Les 30 prochains jours ----------
const noms = Object.fromEntries(POUBELLES.map(p => [p.id, p.nom]));
const aujourdhui = minuit(new Date());
const format = d => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

console.log("Collectes des 30 prochains jours à Gournay-sur-Marne :\n");
for (let i = 0; i < 30; i++) {
  const d = ajouterJours(aujourdhui, i);
  const ids = collectesDuJour(d);
  if (ids.length) console.log(`  ${format(d).padEnd(28)} ${ids.map(id => noms[id]).join(", ")}`);
}

// ---------- 3. Collectes un jour férié (12 prochains mois) ----------
const fin = ajouterJours(aujourdhui, 365);
const feries = [aujourdhui.getFullYear(), aujourdhui.getFullYear() + 1].flatMap(moteur.joursFeries);
console.log("\nCollectes qui tombent un jour férié (à faire confirmer par le SIETREM) :\n");
feries.sort((x, y) => x.date.localeCompare(y.date));
for (const f of feries) {
  const [a, m, j] = f.date.split("-").map(Number);
  const d = jour(a, m, j);
  if (d < aujourdhui || d > fin) continue;
  const ids = collectesDuJour(d);
  if (ids.length) console.log(`  ${`${format(d)} ${a}`.padEnd(28)} ${f.nom.padEnd(20)} ${ids.map(id => noms[id]).join(", ")}`);
}
console.log("\nRappel : aucun jour férié n'est décalé sans confirmation officielle du SIETREM.");
