"use client";
import { useEffect, useState } from "react";
import { chercherAdresses, secteurPour } from "../lib/adresses";
import { COMMUNE } from "../lib/collectes";

/**
 * Bloc « Votre adresse » de l'écran d'accueil.
 * - Sans adresse : un champ de recherche et des propositions à toucher.
 * - Avec une adresse : l'adresse, son secteur et un bouton « Changer ».
 */
export default function RechercheAdresse({ adresse, onChoisir }) {
  const [texte, setTexte] = useState("");
  const [propositions, setPropositions] = useState([]);
  const [etat, setEtat] = useState("repos"); // repos | recherche | vide | erreur

  // Lance la recherche 300 ms après la dernière frappe.
  useEffect(() => {
    if (texte.trim().length < 3) { setPropositions([]); setEtat("repos"); return; }
    const annulation = new AbortController();
    const attente = setTimeout(async () => {
      setEtat("recherche");
      try {
        const resultats = await chercherAdresses(texte, { signal: annulation.signal });
        setPropositions(resultats);
        setEtat(resultats.length ? "repos" : "vide");
      } catch (e) {
        if (e.name !== "AbortError") { setPropositions([]); setEtat("erreur"); }
      }
    }, 300);
    return () => { clearTimeout(attente); annulation.abort(); };
  }, [texte]);

  if (adresse) {
    return (
      <section className="card adresse">
        <div>
          <p className="eyebrow">Votre adresse</p>
          <p className="adresse-texte">{adresse.texte}</p>
          <p className="rule">Secteur de collecte : {secteurPour(adresse).nom}</p>
        </div>
        <button type="button" className="btn" onClick={() => onChoisir(null)}>Changer</button>
      </section>
    );
  }

  return (
    <section className="card">
      <label className="eyebrow" htmlFor="adresse">Votre adresse à {COMMUNE.nom}</label>
      <input
        id="adresse" className="champ" type="text" inputMode="text" autoComplete="street-address"
        placeholder="Exemple : 12 avenue Paul Doumer"
        value={texte} onChange={e => setTexte(e.target.value)}
      />
      <div aria-live="polite">
        {etat === "recherche" && <p className="rule">Recherche…</p>}
        {etat === "vide" && (
          <p className="rule">
            Aucune adresse trouvée à {COMMUNE.nom}. ÉcoClic ne couvre que cette commune pour l'instant.
          </p>
        )}
        {etat === "erreur" && (
          <p className="rule">La recherche d'adresse ne répond pas. Vérifiez votre connexion et réessayez.</p>
        )}
      </div>
      {propositions.length > 0 && (
        <ul className="propositions">
          {propositions.map(p => (
            <li key={p.banId}>
              <button type="button" onClick={() => { onChoisir(p); setTexte(""); }}>
                {p.texte}
                {!p.precise && <span className="rule"> — toute la rue</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
