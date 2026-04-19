import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_BATCH = 50

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

interface InviteResult {
  speaker_id: string
  ok: boolean
  invitation_id?: string
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    const body = await req.json() as {
      project_id?: string
      speaker_ids?: string[]
      message?: string
    }
    const { project_id, speaker_ids, message } = body

    if (!project_id || !Array.isArray(speaker_ids) || speaker_ids.length === 0) {
      return json({ error: 'project_id et speaker_ids requis' }, 400)
    }
    if (speaker_ids.length > MAX_BATCH) {
      return json({ error: `Maximum ${MAX_BATCH} invitations par batch` }, 400)
    }

    // Charger projet
    const { data: project } = await admin
      .from('projects')
      .select('id, owner_id, rate_per_hour_fcfa, max_speakers')
      .eq('id', project_id)
      .single()

    if (!project) return json({ error: 'Projet introuvable' }, 404)
    if (project.owner_id !== user.id && profile.role !== 'admin') {
      return json({ error: 'Accès interdit' }, 403)
    }

    // Compte existants pour max_speakers
    let remainingSlots = Number.POSITIVE_INFINITY
    if (project.max_speakers != null) {
      const { count: activeCount } = await admin
        .from('project_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .in('status', ['pending', 'accepted'])
      remainingSlots = project.max_speakers - (activeCount ?? 0)
    }

    // Durée estimée
    const { count: phraseCount } = await admin
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)
    const estimatedDurationMinutes = phraseCount
      ? Math.ceil((phraseCount * 5) / 60)
      : null

    // Vérifier quels speakers ont un profil
    const { data: speakers } = await admin
      .from('speaker_profiles')
      .select('id')
      .in('id', speaker_ids) as unknown as {
        data: { id: string }[] | null
      }
    const validIds = new Set((speakers ?? []).map(s => s.id))

    // Invitations existantes non-expirées
    const { data: existing } = await admin
      .from('project_invitations')
      .select('speaker_id, status')
      .eq('project_id', project_id)
      .in('speaker_id', speaker_ids)
      .neq('status', 'expired') as unknown as {
        data: { speaker_id: string; status: string }[] | null
      }
    const alreadyInvited = new Set((existing ?? []).map(e => e.speaker_id))

    const results: InviteResult[] = []
    const toInsert: Record<string, unknown>[] = []

    for (const sid of speaker_ids) {
      if (!validIds.has(sid)) {
        results.push({ speaker_id: sid, ok: false, error: 'Locuteur introuvable' })
        continue
      }
      if (alreadyInvited.has(sid)) {
        results.push({ speaker_id: sid, ok: false, error: 'Invitation déjà en cours' })
        continue
      }
      if (remainingSlots <= 0) {
        results.push({ speaker_id: sid, ok: false, error: 'Limite de locuteurs atteinte' })
        continue
      }
      remainingSlots -= 1
      toInsert.push({
        project_id,
        speaker_id: sid,
        invited_by: user.id,
        message: message ?? null,
        status: 'pending',
        rate_snapshot_fcfa: project.rate_per_hour_fcfa,
        estimated_duration_minutes: estimatedDurationMinutes,
      })
    }

    if (toInsert.length > 0) {
      const { data: inserted, error: insErr } = await admin
        .from('project_invitations')
        .insert(toInsert)
        .select('id, speaker_id')

      if (insErr) {
        console.error('bulk insert error:', insErr)
        return json({ error: insErr.message }, 500)
      }

      for (const row of (inserted as { id: string; speaker_id: string }[] | null) ?? []) {
        results.push({ speaker_id: row.speaker_id, ok: true, invitation_id: row.id })
      }
    }

    const okCount = results.filter(r => r.ok).length
    return json({
      data: {
        total: speaker_ids.length,
        sent: okCount,
        failed: speaker_ids.length - okCount,
        results,
      },
    })
  } catch (err) {
    console.error('invite-speaker-bulk error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
