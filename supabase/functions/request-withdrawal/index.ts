import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

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

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ data: null, error: 'Unauthorized' }, 401)

    // Rate limit : max 5 tentatives de retrait par heure par utilisateur
    if (checkRateLimit(`withdraw:${user.id}`, { max: 5, windowSec: 3600 })) {
      return json({ data: null, error: 'Trop de tentatives. Réessaye dans une heure.' }, 429)
    }

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
    // Pré-check côté Edge pour message rapide. Le check authoritatif est fait par
    // le trigger SQL `check_withdrawal_balance` (migration 036) qui verrouille
    // la ligne speaker_profiles avec FOR UPDATE pour bloquer les race conditions.
    if (speaker.wallet_balance_fcfa < amount_fcfa) return json({ data: null, error: 'Solde insuffisant' }, 400)

    // Créer la demande de retrait — le trigger DB peut RAISE EXCEPTION si :
    //  - solde insuffisant (race condition entre 2 requêtes concurrentes)
    //  - un autre retrait pending/approved existe déjà
    const { data: withdrawal, error: wErr } = await admin
      .from('withdrawals')
      .insert({ speaker_id: user.id, amount_fcfa, method, destination, status: 'pending' })
      .select('id')
      .single()

    if (wErr || !withdrawal) {
      console.error('Withdrawal insert error:', wErr?.message)
      // Mapper les erreurs du trigger vers des messages clairs côté UI
      const msg = wErr?.message ?? ''
      if (msg.includes('Solde insuffisant')) {
        return json({ data: null, error: 'Solde insuffisant' }, 400)
      }
      if (msg.includes('déjà en cours de traitement')) {
        return json({ data: null, error: 'Un retrait est déjà en cours. Attendez son traitement avant d\'en créer un autre.' }, 409)
      }
      if (msg.includes('strictement positif')) {
        return json({ data: null, error: 'Montant invalide' }, 400)
      }
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
    console.error('request-withdrawal error:', e instanceof Error ? e.message : String(e))
    return json({ data: null, error: 'Erreur interne' }, 500)
  }
})
