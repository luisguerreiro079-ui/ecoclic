"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigure } from "../../lib/supabase";
import { chargerCalendriersAdmin } from "../../lib/calendrier/base";
import { collectesDuJour, ajouterJours, minuit, joursFeries, dateIso } from "../../lib/calendrier/moteur";

// Espace administrateur : vérifier un calendrier, puis le publier.
// Les droits sont contrôlés dans la base. Cette page ne fait qu'afficher :
// même si quelqu'un l'ouvre sans être administrateur, la base refuse toute modification.

const STATUTS = { brouillon: "Brouillon", a_verifier: "À vérifier", publie: "Publié", archive: "Archivé" };
const jourLong = d => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dateCourte = iso => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(undefined);
  const [donnees, setDonnees] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const recharger = useCallback(async () => {
    try { setDonnees(await chargerCalendriersAdmin()); }
    catch (e) { setMessage(`Lecture impossible : ${e.message}`); }
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setRole(session === null ? null : undefined); return; }
    supabase.from("profils").select("role").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => {
        setRole(data?.role ?? null);
        if (data?.role === "admin") recharger();
      });
  }, [session, recharger]);

  // Applique une modification, puis relit la base.
  async function modifier(action) {
    setMessage("");
    const { error } = await action();
    if (error) setMessage(`La modification a été refusée : ${error.message}`);
    await recharger();
  }

  let contenu;
  if (!supabaseConfigure) contenu = <p className="rule">La base de données n'est pas reliée à cette version de l'appli.</p>;
  else if (session === undefined || (session && role === undefined)) contenu = <p className="rule">Chargement…</p>;
  else if (!session) contenu = <p className="rule">Connectez-vous d'abord dans <Link href="/compte">Mon compte</Link>.</p>;
  else if (role !== "admin") contenu = <p className="rule">Cette page est réservée aux administrateurs d'ÉcoClic.</p>;

  return (
    <main className="wrap">
      <header>
        <h1>Administration</h1>
        <p className="sub"><Link href="/">← Retour au calendrier</Link> · <Link href="/compte">Mon compte</Link></p>
      </header>

      {contenu ? <section className="card">{contenu}</section>
        : !donnees ? <section className="card"><p className="rule">Chargement des calendriers…</p></section>
        : donnees.calendriers.length === 0 ? <section className="card"><p className="rule">Aucun calendrier dans la base.</p></section>
        : donnees.calendriers.map(c => (
          <Calendrier key={c.id} c={c} types={donnees.types} utilisateur={session.user.id} modifier={modifier} />
        ))}

      {message && <p className="notice" role="alert">{message}</p>}
    </main>
  );
}

function Calendrier({ c, types, utilisateur, modifier }) {
  const [verifie, setVerifie] = useState(false);
  const noms = Object.fromEntries(types.map(t => [t.id, t.nom]));
  const couleurs = Object.fromEntries(types.map(t => [t.id, t.couleur]));
  const aConfirmer = c.regles.filter(r => r.a_confirmer);

  // Aperçu : ce que le moteur calcule pour les 30 prochains jours avec ces règles.
  const aujourdhui = minuit(new Date());
  const apercu = [];
  for (let i = 0; i < 30; i++) {
    const d = ajouterJours(aujourdhui, i);
    const ids = collectesDuJour(d, c.regles, c.exceptions);
    if (ids.length) apercu.push({ d, ids });
  }

  // Collectes qui tombent un jour férié dans les 12 prochains mois.
  const fin = ajouterJours(aujourdhui, 365);
  const feries = [aujourdhui.getFullYear(), aujourdhui.getFullYear() + 1].flatMap(joursFeries)
    .sort((x, y) => x.date.localeCompare(y.date))
    .map(f => { const [a, m, j] = f.date.split("-").map(Number); return { ...f, d: new Date(a, m - 1, j) }; })
    .filter(f => f.d >= aujourdhui && f.d <= fin)
    .map(f => ({ ...f, ids: collectesDuJour(f.d, c.regles, c.exceptions) }))
    .filter(f => f.ids.length);

  const publier = () => modifier(async () => {
    const maintenant = new Date().toISOString();
    const maj = await supabase.from("calendriers")
      .update({ statut: "publie", verifie_par: utilisateur, verifie_le: maintenant, publie_le: maintenant })
      .eq("id", c.id);
    if (maj.error) return maj;
    return supabase.from("verifications").insert({
      calendrier_id: c.id, fait_par: utilisateur, resultat: "conforme",
      commentaire: "Comparé au calendrier officiel avant publication",
    });
  });
  const depublier = () => modifier(() =>
    supabase.from("calendriers").update({ statut: "a_verifier" }).eq("id", c.id));
  const confirmerRegle = id => modifier(() =>
    supabase.from("regles_collecte").update({ a_confirmer: false }).eq("id", id));

  return (
    <>
      <section className="card">
        <p className="eyebrow">{c.secteur?.commune?.nom} · {c.secteur?.nom}</p>
        <p className="adresse-texte">
          Statut : {STATUTS[c.statut] ?? c.statut}
          {c.statut === "publie" && c.verifie_le && <> · vérifié le {dateCourte(c.verifie_le)}</>}
        </p>
        <p className="rule">Valable du {dateCourte(c.valable_du)} au {dateCourte(c.valable_au)}.</p>
        {c.source && (
          <p className="rule">
            Source officielle : {c.source.url
              ? <a href={c.source.url} target="_blank" rel="noopener">{c.source.titre}</a>
              : c.source.titre}
          </p>
        )}
      </section>

      <section>
        <p className="eyebrow">Règles de collecte</p>
        <div className="list">
          {c.regles.map(r => (
            <div key={r.id} className="row">
              <span className="lid" style={{ background: couleurs[r.type_collecte_id] }} aria-hidden="true" />
              <div>
                <div className="name">{noms[r.type_collecte_id]}{r.a_confirmer && <span className="tag">à confirmer</span>}</div>
                <div className="rule">{r.libelle}</div>
              </div>
              {r.a_confirmer
                ? <button type="button" className="btn" onClick={() => confirmerRegle(r.id)}>Confirmer</button>
                : <span className="rule">confirmée</span>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow">Aperçu des 30 prochains jours</p>
        <div className="list">
          {apercu.map(({ d, ids }) => (
            <div key={dateIso(d)} className="row sans-bac">
              <div className="name premiere-maj">{jourLong(d)}</div>
              <div className="rule">{ids.map(id => noms[id]).join(", ")}</div>
            </div>
          ))}
        </div>
      </section>

      {feries.length > 0 && (
        <section>
          <p className="eyebrow">Collectes un jour férié, à faire confirmer par le SIETREM</p>
          <div className="list">
            {feries.map(f => (
              <div key={f.date} className="row sans-bac">
                <div className="name premiere-maj">{jourLong(f.d)} {f.d.getFullYear()} · {f.nom}</div>
                <div className="rule">{f.ids.map(id => noms[id]).join(", ")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        {c.statut === "publie" ? (
          <>
            <p className="rule">Ce calendrier est public : c'est lui que le site affiche aux habitants.</p>
            <button type="button" className="btn" onClick={depublier}>Retirer de la publication</button>
          </>
        ) : (
          <>
            <p className="eyebrow">Publication</p>
            {aConfirmer.length > 0 && (
              <p className="notice">
                {aConfirmer.length === 1 ? "Une règle est encore" : `${aConfirmer.length} règles sont encore`} marquée
                {aConfirmer.length > 1 ? "s" : ""} « à confirmer ». Vous pouvez publier quand même :
                la mention « à confirmer » restera affichée aux habitants.
              </p>
            )}
            <label className="coche">
              <input type="checkbox" checked={verifie} onChange={e => setVerifie(e.target.checked)} />
              <span>J'ai comparé ces règles et cet aperçu avec le calendrier officiel du SIETREM.</span>
            </label>
            <button type="button" className="btn plein" disabled={!verifie} onClick={publier}>
              Publier ce calendrier
            </button>
          </>
        )}
      </section>
    </>
  );
}
