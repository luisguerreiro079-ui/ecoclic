// Connexion à la base de données Supabase.
// Les deux valeurs viennent de .env.local (sur l'ordinateur) et des réglages
// « Environment Variables » du projet sur Vercel (en ligne).
// Ce sont des valeurs publiques : les droits sont contrôlés dans la base (RLS).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Vrai si les deux valeurs sont renseignées. */
export const supabaseConfigure = Boolean(url && cle);

/** Client Supabase, ou null si l'appli n'est pas encore reliée à la base. */
export const supabase = supabaseConfigure ? createClient(url, cle) : null;
