import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

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

    const { invitation_id } = await req.json() as { invitation_id?: string }
    if (!invitation_id) return json({ error: 'invitation_id requis' }, 400)

    // Charger l'invitation + owner du projet
    const { data: inv } = await admin
      .from('project_invitations')
      .select('id, status, project_id, projects!inner(owner_id)')
      .eq('id', invitation_id)
      .single() as unknown as {
        data: {
          id: string
          status: string
          project_id: string
          projects: { owner_id: string }
        } | null
      }

    if (!inv) return json({ error: 'Invitation introuvable' }, 404)

    if (inv.projects.owner_id !== user.id && profile.role !== 'admin') {
      return json({ error: 'Accès interdit' }, 403)
    }

    if (inv.status !== 'pending') {
      return json({ error: 'Seules les invitations en attente peuvent être annulées' }, 400)
    }

    const { error: updateErr } = await admin
      .from('project_invitations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq('id', invitation_id)

    if (updateErr) {
      console.error('cancel invitation error:', updateErr)
      return json({ error: updateErr.message }, 500)
    }

    return json({ data: { invitation_id } })
  } catch (err) {
    console.error('cancel-invitation error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
