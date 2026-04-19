import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Vérifier l'identité du client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Non authentifié' }, 401)

    // Vérifier que l'utilisateur est un client ou admin
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'client' && profile.role !== 'admin')) {
      return json({ error: 'Réservé aux clients' }, 403)
    }

    const body = await req.json() as {
      project_id?: string
      speaker_id?: string
      message?: string
    }
    const { project_id, speaker_id, message } = body

    if (!project_id || !speaker_id) {
      return json({ error: 'project_id et speaker_id requis' }, 400)
    }

    // Vérifier que le projet appartient au client + charger tarif pour snapshot
    const { data: project } = await admin
      .from('projects')
      .select('id, owner_id, rate_per_hour_fcfa, max_speakers')
      .eq('id', project_id)
      .single()

    if (!project) return json({ error: 'Projet introuvable' }, 404)
    if (project.owner_id !== user.id && profile.role !== 'admin') {
      return json({ error: 'Accès interdit' }, 403)
    }

    // Check max_speakers : invitations pending + accepted ne doit pas dépasser
    if (project.max_speakers != null) {
      const { count: activeCount } = await admin
        .from('project_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .in('status', ['pending', 'accepted'])

      if (activeCount != null && activeCount >= project.max_speakers) {
        return json({
          error: `Limite atteinte : ${project.max_speakers} locuteurs maximum pour ce projet.`,
        }, 400)
      }
    }

    // Vérifier que le locuteur a un profil
    const { data: speaker } = await admin
      .from('speaker_profiles')
      .select('id')
      .eq('id', speaker_id)
      .single()

    if (!speaker) {
      return json({ error: 'Locuteur introuvable' }, 400)
    }

    // Vérifier qu'une invitation n'existe pas déjà (non expirée)
    const { data: existing } = await admin
      .from('project_invitations')
      .select('id, status')
      .eq('project_id', project_id)
      .eq('speaker_id', speaker_id)
      .neq('status', 'expired')
      .maybeSingle()

    if (existing) {
      return json({ error: 'Une invitation est déjà en cours pour ce locuteur' }, 409)
    }

    // Calcul durée estimée : nb phrases × 5s par défaut
    const { count: phraseCount } = await admin
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)

    const estimatedDurationMinutes = phraseCount
      ? Math.ceil((phraseCount * 5) / 60)
      : null

    // Créer l'invitation avec snapshots
    const { data: invitation, error: insertErr } = await admin
      .from('project_invitations')
      .insert({
        project_id,
        speaker_id,
        invited_by: user.id,
        message: message ?? null,
        status: 'pending',
        rate_snapshot_fcfa: project.rate_per_hour_fcfa,
        estimated_duration_minutes: estimatedDurationMinutes,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('insert invitation error:', insertErr)
      return json({ error: insertErr.message }, 500)
    }

    return json({ data: { invitation_id: invitation.id } })
  } catch (err) {
    console.error('invite-speaker error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
