"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COMMUNE, CALENDRIER_LOCAL, construirePoubelles, ajouterJours, minuit } from "../lib/collectes";
import { collectesDuJour, prochaineCollecte } from "../lib/calendrier/moteur";
import { chargerCalendrierPublie } from "../lib/calendrier/base";
import { lireAdresseEnregistree, enregistrerAdresse } from "../lib/adresses";
import RechercheAdresse from "./RechercheAdresse";

const longue = d => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const courte = d => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function Bac({ couleur }) {
  return <span className="lid" style={{ background: couleur }} aria-hidden="true" />;
}

export default function Accueil() {
  // L'heure est lue dans le navigateur, pour éviter un décalage entre serveur et téléphone.
  const [maintenant, setMaintenant] = useState(null);
  const [adresse, setAdresse] = useState(null);
  // Le calendrier vient des fichiers de l'appli, puis de la base s'il y est publié.
  const [calendrier, setCalendrier] = useState(CALENDRIER_LOCAL);
  const choisirAdresse = a => { setAdresse(a); enregistrerAdresse(a); };

  useEffect(() => {
    setAdresse(lireAdresseEnregistree());
    setMaintenant(new Date());
    const t = setInterval(() => setMaintenant(new Date()), 5 * 60 * 1000);
    chargerCalendrierPublie(COMMUNE.codeInsee).then(publie => {
      if (publie) setCalendrier({
        poubelles: construirePoubelles(publie.types, publie.regles),
        regles: publie.regles, exceptions: publie.exceptions, verifieLe: publie.verifieLe,
      });
    }).catch(() => {});
    return () => clearInterval(t);
  }, []);

  if (!maintenant) return <main className="wrap"><h1>ÉcoClic</h1></main>;

  const { poubelles, regles, exceptions, verifieLe } = calendrier;
  const parId = Object.fromEntries(poubelles.map(p => [p.id, p]));
  const duJour = d => collectesDuJour(d, regles, exceptions).filter(id => parId[id]);

  const aujourdhui = minuit(maintenant);
  const demain = ajouterJours(aujourdhui, 1);
  const ceSoir = duJour(demain);

  let prochaine = null;
  if (!ceSoir.length) {
    for (let i = 2; i < 60; i++) {
      const d = ajouterJours(aujourdhui, i);
      const ids = duJour(d);
      if (ids.length) { prochaine = { d, ids }; break; }
    }
  }

  return (
    <main className="wrap">
      <header className="entete">
        <div>
          <h1>ÉcoClic</h1>
          <p className="sub">Gournay-sur-Marne · collectes SIETREM</p>
        </div>
        <Link href="/compte" className="btn">Mon compte</Link>
      </header>

      <RechercheAdresse adresse={adresse} onChoisir={choisirAdresse} />

      <section className="hero" aria-live="polite">
        {ceSoir.length ? (
          <>
            <div className="when">Ce soir · collecte {longue(demain)}</div>
            <p className="big">À sortir ce soir</p>
            <div className="chips">
              {ceSoir.map(id => (
                <span key={id} className="chip"><Bac couleur={parId[id].couleur} />{parId[id].nom}</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="when">Ce soir</div>
            <p className="big">Rien à sortir ce soir</p>
            {prochaine && (
              <p className="note">
                Prochaine sortie : {longue(ajouterJours(prochaine.d, -1))} au soir, pour{" "}
                {prochaine.ids.map(id => parId[id].nom.toLowerCase()).join(", ")}.
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <p className="eyebrow">Prochains passages</p>
        <div className="list">
          {poubelles.map(p => {
            const d = prochaineCollecte(p.id, regles, exceptions, maintenant);
            const ecart = d ? Math.round((d - aujourdhui) / 864e5) : null;
            const quand = ecart === 0 ? "aujourd'hui" : ecart === 1 ? "demain" : ecart !== null ? `dans ${ecart} jours` : "";
            return (
              <div key={p.id} className="row">
                <Bac couleur={p.couleur} />
                <div>
                  <div className="name">{p.nom}{p.aConfirmer && <span className="tag">à confirmer</span>}</div>
                  <div className="rule">{p.regle}</div>
                </div>
                <div className="next"><b>{d ? courte(d) : "—"}</b><span>{quand}</span></div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="notice"><b>Jours fériés :</b> aucune collecte n'est décalée tant que le SIETREM ne l'a pas confirmé officiellement.</p>
      <p className="foot">
        Source : <a href="https://www.sietrem.fr/collecte/collecte-gournay-sur-marne/" target="_blank" rel="noopener">sietrem.fr</a>.
        {verifieLe && <> Calendrier vérifié le {new Date(verifieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</>}
        {" "}En cas de différence, le SIETREM fait foi.
      </p>
    </main>
  );
}
