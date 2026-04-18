import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const VALIDATION_REWARD_FCFA = 10

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ data: null, error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ data: null, error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    // Vérifier le profil
    const { data: speaker } = await admin
      .from('speaker_profiles')
      .select('verification_status, reliability_score')
      .eq('id', user.id)
      .single()

    if (!speaker || speaker.verification_status !== 'approved') {
      return json({ data: null, error: 'Profil non approuvé' }, 403)
    }
    if ((speaker.reliability_score ?? 1) < 0.5) {
      return json({ data: null, error: 'Score de fiabilité insuffisant pour valider' }, 403)
    }

    const { recording_id, vote, confidence } = await req.json() as {
      recording_id: string
      vote: boolean
      confidence: 'certain' | 'unsure'
    }

    // Insérer le vote (le trigger DB vérifie l'auto-validation et applique le consensus)
    const { data: validation, error: vErr } = await admin
      .from('peer_validations')
      .insert({
        recording_id,
        validator_id: user.id,
        vote,
        confidence: confidence ?? 'certain',
      })
      .select('id')
      .single()

    if (vErr) {
      if (vErr.message.includes('propres enregistrements')) return json({ data: null, error: vErr.message }, 400)
      if (vErr.code === '23505') return json({ data: null, error: 'Déjà validé' }, 400)
      console.error('Validation insert error:', vErr)
      return json({ data: null, error: 'Erreur lors de la validation' }, 500)
    }

    // Créditer la récompense
    await admin
      .from('wallet_transactions')
      .insert({
        speaker_id: user.id,
        amount_fcfa: VALIDATION_REWARD_FCFA,
        type: 'validation_reward',
        status: 'confirmed',
        reference_table: 'peer_validations',
        reference_id: validation.id,
        description: `Validation enregistrement`,
      })

    return json({ data: { validation_id: validation.id, reward: VALIDATION_REWARD_FCFA }, error: null })
  } catch (e) {
    console.error(e)
    return json({ data: null, error: String(e) }, 500)
  }
})
