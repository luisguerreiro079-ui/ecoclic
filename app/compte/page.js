"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigure } from "../../lib/supabase";

// Page « Mon compte ».
// Connexion sans mot de passe : on saisit son e-mail, on reçoit un lien, on clique dessus.
// À PRÉVOIR : quand ÉcoClic aura son propre service d'envoi d'e-mails (SMTP), remplacer
// le lien par un code à taper (validerCode ci-dessous est déjà prêt). Un code marche
// mieux quand l'appli est installée sur l'écran d'accueil, surtout sur iPhone.

const ROLES = { habitant: "Habitant", moderateur: "Modérateur", admin: "Administrateur",
  professionnel: "Professionnel", commercant: "Commerçant" };

export default function Compte() {
  const [session, setSession] = useState(undefined); // undefined = chargement
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState("email"); // email | envoye
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState("");

  // Suit l'état de connexion.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Lit le rôle du compte connecté.
  useEffect(() => {
    if (!supabase || !session) { setRole(null); return; }
    supabase.from("profils").select("role").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role ?? null));
  }, [session]);

  async function envoyerCode(e) {
    e.preventDefault();
    setOccupe(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/compte` },
    });
    setOccupe(false);
    if (error) setMessage(`L'envoi n'a pas marché : ${error.message}`);
    else { setEtape("envoye"); setMessage(""); }
  }

  // Pas encore utilisé : servira quand l'e-mail contiendra un code (voir en haut du fichier).
  // eslint-disable-next-line no-unused-vars
  async function validerCode(e) {
    e.preventDefault();
    setOccupe(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(), token: code.replace(/\s/g, ""), type: "email",
    });
    setOccupe(false);
    if (error) setMessage("Ce code n'est pas bon ou a expiré. Vérifiez-le ou demandez-en un nouveau.");
    else { setCode(""); setEtape("email"); }
  }

  async function deconnecter() {
    await supabase.auth.signOut();
    setEmail(""); setMessage("");
  }

  return (
    <main className="wrap">
      <header>
        <h1>Mon compte</h1>
        <p className="sub"><Link href="/">← Retour au calendrier</Link></p>
      </header>

      {!supabaseConfigure ? (
        <section className="card">
          <p className="rule">Les comptes ne sont pas encore activés sur cette version de l'appli.</p>
        </section>
      ) : session === undefined ? (
        <section className="card"><p className="rule">Chargement…</p></section>
      ) : session ? (
        <section className="card">
          <p className="eyebrow">Vous êtes connecté</p>
          <p className="adresse-texte">{session.user.email}</p>
          {role && <p className="rule">Type de compte : {ROLES[role] ?? role}</p>}
          <button type="button" className="btn" onClick={deconnecter}>Se déconnecter</button>
        </section>
      ) : etape === "email" ? (
        <form className="card" onSubmit={envoyerCode}>
          <label className="eyebrow" htmlFor="email">Votre adresse e-mail</label>
          <input id="email" className="champ" type="email" required autoComplete="email"
            placeholder="prenom.nom@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="rule">Pas de mot de passe : nous vous envoyons un lien de connexion par e-mail.</p>
          <button type="submit" className="btn plein" disabled={occupe}>
            {occupe ? "Envoi…" : "Recevoir mon lien"}
          </button>
        </form>
      ) : (
        <section className="card">
          <p className="eyebrow">E-mail envoyé</p>
          <p className="adresse-texte">Ouvrez votre boîte mail et cliquez sur le lien « Sign in ».</p>
          <p className="rule">
            Nous l'avons envoyé à {email.trim()}. Il peut mettre une minute à arriver :
            pensez à regarder dans les courriers indésirables.
          </p>
          <button type="button" className="lien" onClick={() => { setEtape("email"); setCode(""); setMessage(""); }}>
            Changer d'adresse e-mail
          </button>
        </section>
      )}

      {message && <p className="notice" role="alert">{message}</p>}

      <p className="foot">
        Votre e-mail sert uniquement à vous connecter et à retrouver vos réglages. Il n'est jamais partagé.
      </p>
    </main>
  );
}
