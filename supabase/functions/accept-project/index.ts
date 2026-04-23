import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') return handlePreflight(corsHeaders)

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ data: null, error: 'Unauthorized' }, 401)

    // Authentifier via le JWT du locuteur
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ data: null, error: 'Unauthorized' }, 401)

    // Vérifier que c'est un locuteur approuvé
    const admin = createClient(supabaseUrl, serviceKey)

    // 1. Le profile global doit avoir role='speaker'
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) return json({ data: null, error: 'Profil introuvable' }, 404)
    if (profile.role !== 'speaker') {
      return json({ data: null, error: 'Seuls les locuteurs peuvent accepter un projet' }, 403)
    }

    // 2. Le speaker_profile doit exister
    const { data: speaker } = await admin
      .from('speaker_profiles')
      .select('id, languages, gender')
      .eq('id', user.id)
      .single()

    if (!speaker) return json({ data: null, error: 'Profil locuteur introuvable' }, 404)

    const { project_id, invitation_id } = await req.json() as {
      project_id: string
      invitation_id?: string
    }

    // Vérifier que le projet est accessible
    const { data: project } = await admin
      .from('projects')
      .select('id, status, is_public, required_languages, required_gender, age_min, age_max')
      .eq('id', project_id)
      .single()

    if (!project) return json({ data: null, error: 'Projet introuvable' }, 404)
    if (project.status !== 'active') return json({ data: null, error: 'Projet non actif' }, 400)

    // Vérifier matching langue
    if (project.required_languages?.length > 0) {
      const hasLang = speaker.languages.some((l: string) => project.required_languages.includes(l))
      if (!hasLang) return json({ data: null, error: 'Langue non correspondante' }, 403)
    }

    // Vérifier si une session existe déjà
    const { data: existingSession } = await admin
      .from('recording_sessions')
      .select('id')
      .eq('project_id', project_id)
      .eq('speaker_id', user.id)
      .single()

    if (existingSession) {
      return json({ data: { session_id: existingSession.id }, error: null })
    }

    // Créer la session
    const { data: newSession, error: sessionErr } = await admin
      .from('recording_sessions')
      .insert({
        project_id,
        speaker_id: user.id,
        invitation_id: invitation_id ?? null,
        speaker_name: user.user_metadata?.full_name ?? null,
        status: 'active',
      })
      .select('id')
      .single()

    if (sessionErr || !newSession) {
      console.error('Session creation error:', sessionErr)
      return json({ data: null, error: 'Erreur de création de session' }, 500)
    }

    // Marquer l'invitation comme acceptée si applicable
    if (invitation_id) {
      await admin
        .from('project_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitation_id)
        .eq('speaker_id', user.id)
    }

    return json({ data: { session_id: newSession.id }, error: null })
  } catch (e) {
    console.error(e)
    return json({ data: null, error: String(e) }, 500)
  }
})
