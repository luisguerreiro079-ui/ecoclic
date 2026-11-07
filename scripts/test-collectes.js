// Vérification rapide du calendrier : npm test
// Affiche les collectes des 30 prochains jours, à comparer avec le calendrier du SIETREM.
import { collectesDuJour, ajouterJours, minuit, POUBELLES } from "../lib/collectes.js";

const noms = Object.fromEntries(POUBELLES.map(p => [p.id, p.nom]));
const aujourdhui = minuit(new Date());

console.log("Collectes des 30 prochains jours à Gournay-sur-Marne :\n");
for (let i = 0; i < 30; i++) {
  const d = ajouterJours(aujourdhui, i);
  const ids = collectesDuJour(d);
  if (ids.length) {
    const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    console.log(`  ${jour.padEnd(28)} ${ids.map(id => noms[id]).join(", ")}`);
  }
}
console.log("\nRappel : aucun jour férié n'est décalé sans confirmation officielle du SIETREM.");
