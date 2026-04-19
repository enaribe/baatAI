import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
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

    // Vérifier le profil et le solde
    const { data: speaker } = await admin
      .from('speaker_profiles')
      .select('wallet_balance_fcfa')
      .eq('id', user.id)
      .single()

    if (!speaker) return json({ data: null, error: 'Profil introuvable' }, 404)

    const { amount_fcfa, method, destination } = await req.json() as {
      amount_fcfa: number
      method: string
      destination: string
    }

    if (!amount_fcfa || amount_fcfa < 5000) return json({ data: null, error: 'Montant minimum : 5 000 FCFA' }, 400)
    if (!destination?.trim()) return json({ data: null, error: 'Destination requise' }, 400)
    if (speaker.wallet_balance_fcfa < amount_fcfa) return json({ data: null, error: 'Solde insuffisant' }, 400)

    // Créer la demande de retrait
    const { data: withdrawal, error: wErr } = await admin
      .from('withdrawals')
      .insert({ speaker_id: user.id, amount_fcfa, method, destination, status: 'pending' })
      .select('id')
      .single()

    if (wErr || !withdrawal) {
      console.error('Withdrawal insert error:', wErr)
      return json({ data: null, error: 'Erreur de création' }, 500)
    }

    // Débiter le wallet immédiatement
    const { error: txErr } = await admin
      .from('wallet_transactions')
      .insert({
        speaker_id: user.id,
        amount_fcfa: -amount_fcfa,
        type: 'withdrawal_request',
        status: 'confirmed',
        reference_table: 'withdrawals',
        reference_id: withdrawal.id,
        description: `Retrait ${method} — ${destination}`,
      })

    if (txErr) {
      console.error('Transaction insert error:', txErr)
      // Rollback le withdrawal
      await admin.from('withdrawals').delete().eq('id', withdrawal.id)
      return json({ data: null, error: 'Erreur de débit du wallet' }, 500)
    }

    return json({ data: { withdrawal_id: withdrawal.id }, error: null })
  } catch (e) {
    console.error(e)
    return json({ data: null, error: String(e) }, 500)
  }
})
