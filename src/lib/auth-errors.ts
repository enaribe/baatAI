/**
 * Détection des erreurs d'inscription liées à la beta privée (whitelist).
 * Le trigger Postgres handle_new_user lance :
 *   RAISE EXCEPTION 'access_denied: ...' USING ERRCODE = '42501';
 * Supabase Auth remonte ce message dans error.message.
 */

export interface ParsedAuthError {
  /** Message à afficher à l'utilisateur (clair, en français) */
  message: string
  /** True si la cause est l'absence de l'email dans la whitelist beta */
  isAccessDenied: boolean
}

export function parseAuthError(error: { message: string } | null | undefined): ParsedAuthError {
  if (!error) return { message: '', isAccessDenied: false }
  const raw = error.message ?? ''

  // Notre marqueur custom du trigger
  if (raw.includes('access_denied') || raw.toLowerCase().includes('n\'est pas autorisé')) {
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
