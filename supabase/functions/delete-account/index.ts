import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') return handlePreflight(corsHeaders)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user || !user.email) return json({ error: 'Non authentifié' }, 401)

    const { password, confirmation } = await req.json() as {
      password?: string
      confirmation?: string
    }

    if (confirmation !== 'SUPPRIMER') {
      return json({ error: 'Confirmation invalide. Tapez "SUPPRIMER" pour confirmer.' }, 400)
    }
    if (!password) {
      return json({ error: 'Mot de passe requis' }, 400)
    }

    // Re-auth : vérifier le mot de passe en créant un client anon
    const reAuthClient = createClient(supabaseUrl, anonKey)
    const { error: reAuthError } = await reAuthClient.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (reAuthError) {
      return json({ error: 'Mot de passe incorrect' }, 403)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Charger le rôle pour décider de la stratégie
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as unknown as { data: { role: string } | null }

    if (!profile) {
      return json({ error: 'Profil introuvable' }, 404)
    }

    // Admin : jamais via self-service
    if (profile.role === 'admin') {
      return json({
        error: 'Les comptes administrateurs ne peuvent pas être supprimés via cette interface. Contactez le support.',
      }, 403)
    }

    if (profile.role === 'speaker') {
      // Vérifier qu'il n'y a pas de retrait pending (bloquant)
      const { count: pendingWithdrawals } = await admin
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('speaker_id', user.id)
        .in('status', ['pending', 'approved'])

      if (pendingWithdrawals && pendingWithdrawals > 0) {
        return json({
          error: 'Vous avez un retrait en cours. Veuillez attendre qu\'il soit traité avant de supprimer votre compte.',
        }, 400)
      }

      // Anonymiser via RPC SQL (une seule transaction atomique)
      const { error: anonErr } = await admin.rpc('anonymize_speaker', { p_user_id: user.id }) as unknown as {
        error: { message: string } | null
      }
      if (anonErr) {
        console.error('anonymize error:', anonErr)
        return json({ error: 'Erreur d\'anonymisation' }, 500)
      }

      // Puis supprimer l'auth user (le JWT devient invalide côté client)
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(user.id)
      if (delAuthErr) {
        console.error('auth deleteUser error:', delAuthErr)
        // Pas bloquant : les données sont déjà anonymisées
      }

      return json({ data: { kind: 'anonymized' } })
    }

    if (profile.role === 'client') {
      // Vérifier s'il a des projets actifs
      const { data: hasActive } = await admin.rpc('client_has_active_projects', {
        p_user_id: user.id,
      }) as unknown as { data: boolean | null }

      if (hasActive) {
        return json({
          error: 'Vous avez encore des projets actifs. Archivez-les ou marquez-les comme terminés avant de supprimer votre compte.',
        }, 400)
      }

      // Hard delete : supabase cascade ON DELETE sur profiles / speaker_profiles / projects
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
      if (delErr) {
        console.error('client delete error:', delErr)
        return json({ error: 'Erreur lors de la suppression' }, 500)
      }

      return json({ data: { kind: 'deleted' } })
    }

    return json({ error: 'Rôle inconnu' }, 400)
  } catch (err) {
    console.error('delete-account error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
