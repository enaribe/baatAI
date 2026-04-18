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

    // Vérifier que le projet appartient au client
    const { data: project } = await admin
      .from('projects')
      .select('id, owner_id')
      .eq('id', project_id)
      .single()

    if (!project) return json({ error: 'Projet introuvable' }, 404)
    if (project.owner_id !== user.id && profile.role !== 'admin') {
      return json({ error: 'Accès interdit' }, 403)
    }

    // Vérifier que le locuteur est approuvé
    const { data: speaker } = await admin
      .from('speaker_profiles')
      .select('id, verification_status')
      .eq('id', speaker_id)
      .single()

    if (!speaker || speaker.verification_status !== 'approved') {
      return json({ error: 'Locuteur non approuvé' }, 400)
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

    // Créer l'invitation
    const { data: invitation, error: insertErr } = await admin
      .from('project_invitations')
      .insert({
        project_id,
        speaker_id,
        invited_by: user.id,
        message: message ?? null,
        status: 'pending',
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
