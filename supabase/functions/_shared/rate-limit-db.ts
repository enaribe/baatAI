// Rate limiter persistant pour les Edge Functions Daandé.
//
// Remplace _shared/rate-limit.ts (in-memory, bypassable multi-workers).
// Stocke les hits dans la table rate_limits et compte par fenêtre temporelle.
//
// Usage :
//   import { checkRateLimitDB } from '../_shared/rate-limit-db.ts'
//   const limited = await checkRateLimitDB(supabase, `gen-plan:${user.id}`, 5, 3600)
//   if (limited) return json({ error: 'Trop de requêtes' }, 429)
//
// Important : le client Supabase doit être en service_role (sinon RLS bloque
// l'accès à la table rate_limits). La RPC check_rate_limit est SECURITY
// DEFINER mais elle utilise auth.uid() qui sera NULL en service_role —
// pas grave, on identifie via le bucket qui contient déjà user.id.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CheckRateLimitOpts {
  /** Nombre max de requêtes dans la fenêtre */
  max: number;
  /** Fenêtre en secondes */
  windowSec: number;
}

/**
 * Retourne true si la limite est dépassée (la requête doit être rejetée).
 * Retourne false si la requête peut passer (et l'enregistre dans le compteur).
 *
 * En cas d'erreur DB, on échoue ouvert (return false) pour ne pas bloquer
 * l'utilisateur si Postgres a un hoquet. À reconsidérer si on veut une
 * politique fail-closed plus stricte.
 */
export async function checkRateLimitDB(
  supabase: SupabaseClient,
  bucket: string,
  opts: CheckRateLimitOpts,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_max: opts.max,
      p_window_sec: opts.windowSec,
    });
    if (error) {
      console.error("checkRateLimitDB RPC error:", error.message);
      return false; // fail-open
    }
    return data === true;
  } catch (err) {
    console.error("checkRateLimitDB exception:", err);
    return false; // fail-open
  }
}
