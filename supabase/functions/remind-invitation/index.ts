import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'

const REMIND_COOLDOWN_HOURS = 7 * 24

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
    if (!user) return json({ error: 'Non authentifié' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'client' && profile.role !== 'admin')) {
      return json({ error: 'Réservé aux clients' }, 403)
    }

    const { invitation_id } = await req.json() as { invitation_id?: string }
    if (!invitation_id) return json({ error: 'invitation_id requis' }, 400)

    const { data: inv } = await admin
      .from('project_invitations')
      .select('id, status, project_id, speaker_id, reminded_at, message, expires_at, projects!inner(owner_id, name, language_label, target_language, rate_per_hour_fcfa)')
      .eq('id', invitation_id)
      .single() as unknown as {
        data: {
          id: string
          status: string
          project_id: string
          speaker_id: string
          reminded_at: string | null
          message: string | null
          expires_at: string
          projects: {
            owner_id: string
            name: string
            language_label: string | null
            target_language: string
            rate_per_hour_fcfa: number
          }
        } | null
      }

    if (!inv) return json({ error: 'Invitation introuvable' }, 404)
    if (inv.projects.owner_id !== user.id && profile.role !== 'admin') {
      return json({ error: 'Accès interdit' }, 403)
    }
    if (inv.status !== 'pending') {
      return json({ error: 'Seules les invitations en attente peuvent être rappelées' }, 400)
    }

    // Rate limit : 1 rappel par 7 jours
    if (inv.reminded_at) {
      const elapsed = Date.now() - new Date(inv.reminded_at).getTime()
      const hoursLeft = REMIND_COOLDOWN_HOURS - elapsed / (1000 * 60 * 60)
      if (hoursLeft > 0) {
        return json({
          error: `Rappel déjà envoyé récemment. Réessayez dans ${Math.ceil(hoursLeft / 24)} jour(s).`,
        }, 429)
      }
    }

    const now = new Date().toISOString()

    // Update reminded_at
    await admin
      .from('project_invitations')
      .update({ reminded_at: now })
      .eq('id', invitation_id)

    // Créer une notification "rappel" pour le speaker
    await admin
      .from('notifications')
      .insert({
        user_id: inv.speaker_id,
        type: 'invitation_reminder',
        payload: {
          invitation_id: inv.id,
          project_id: inv.project_id,
          project_name: inv.projects.name,
          language_label: inv.projects.language_label,
          target_language: inv.projects.target_language,
          rate_per_hour_fcfa: inv.projects.rate_per_hour_fcfa,
          message: inv.message,
          expires_at: inv.expires_at,
        },
      })

    return json({ data: { invitation_id, reminded_at: now } })
  } catch (err) {
    console.error('remind-invitation error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
