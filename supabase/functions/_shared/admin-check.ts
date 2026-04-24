// Helper partagé : vérifie qu'un appel Edge Function provient d'un admin authentifié.
// Retourne null si OK, ou un objet { error, status } à renvoyer en cas d'échec.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AdminCheckResult {
  userId: string
  email: string
  admin: SupabaseClient
}

export interface AdminCheckError {
  error: string
  status: number
}

/**
 * Vérifie que la requête contient un Authorization Bearer JWT valide
 * d'un compte avec role='admin'. Retourne le client service_role pour les ops admin.
 */
export async function requireAdmin(req: Request): Promise<AdminCheckResult | AdminCheckError> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { error: 'Non authentifié', status: 401 }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Client utilisateur pour valider le JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user || !user.email) return { error: 'Session invalide', status: 401 }

  // Vérifier le rôle dans profiles (la source de vérité, pas le JWT metadata)
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: profile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single() as unknown as {
      data: { role: string; status: string } | null
    }

  if (!profile || profile.role !== 'admin') {
    return { error: 'Accès réservé aux administrateurs', status: 403 }
  }
  if (profile.status !== 'active') {
    return { error: 'Compte admin non actif', status: 403 }
  }

  return { userId: user.id, email: user.email, admin }
}
