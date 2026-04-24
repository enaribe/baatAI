/**
 * Détection des erreurs d'inscription liées à la beta privée (whitelist).
 * Le trigger Postgres handle_new_user lance :
 *   RAISE EXCEPTION 'access_denied: ...' USING ERRCODE = '42501';
 * Supabase Auth NE PROPAGE PAS le message custom et le remplace par
 * "Database error saving new user" côté API. On compense :
 *   - en interceptant ce message générique comme un access_denied
 *   - via un pré-check whitelist (precheckWhitelist) avant le signup pour
 *     afficher une erreur claire AVANT de tenter l'auth.
 */

import { supabase } from './supabase'

/**
 * Vérifie via la RPC publique is_email_whitelisted si un email peut s'inscrire.
 * Retourne :
 *   - true  : email autorisé (whitelist active, non utilisée, non expirée)
 *   - false : email pas dans la whitelist OU déjà utilisé OU expiré
 *   - null  : erreur réseau / RPC indisponible (laisser passer le signup)
 */
export async function precheckWhitelist(email: string): Promise<boolean | null> {
  try {
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: boolean | null
        error: { message: string } | null
      }>
    }).rpc('is_email_whitelisted', { p_email: email.trim().toLowerCase() })
    if (error) {
      console.warn('[precheckWhitelist] RPC error:', error.message)
      return null
    }
    return data === true
  } catch (e) {
    console.warn('[precheckWhitelist] exception:', e)
    return null
  }
}

export interface ParsedAuthError {
  /** Message à afficher à l'utilisateur (clair, en français) */
  message: string
  /** True si la cause est l'absence de l'email dans la whitelist beta */
  isAccessDenied: boolean
}

export function parseAuthError(error: { message: string } | null | undefined): ParsedAuthError {
  if (!error) return { message: '', isAccessDenied: false }
  const raw = error.message ?? ''

  // Notre marqueur custom du trigger handle_new_user
  // Note : Supabase Auth peut convertir notre RAISE EXCEPTION en
  // "Database error saving new user" (message générique) côté API.
  // On traite cette variante comme un access_denied car en pratique,
  // c'est notre trigger qui bloque dans 99% des cas.
  if (
    raw.includes('access_denied') ||
    raw.toLowerCase().includes('n\'est pas autorisé') ||
    raw.includes('Database error saving new user') ||
    raw.includes('unexpected_failure')
  ) {
    return {
      message: "Cet email n'est pas encore autorisé. Daandé est en beta privée — demandez un accès.",
      isAccessDenied: true,
    }
  }

  // Erreurs Supabase classiques
  if (raw.includes('User already registered') || raw.includes('already exists')) {
    return {
      message: 'Un compte existe déjà avec cet email. Connectez-vous.',
      isAccessDenied: false,
    }
  }

  if (raw.includes('Invalid login credentials')) {
    return {
      message: 'Email ou mot de passe incorrect',
      isAccessDenied: false,
    }
  }

  if (raw.includes('Email not confirmed')) {
    return {
      message: 'Veuillez confirmer votre email avant de vous connecter.',
      isAccessDenied: false,
    }
  }

  return { message: raw, isAccessDenied: false }
}
