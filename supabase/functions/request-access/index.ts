import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { sendEmail } from '../_shared/email.ts'

interface RequestAccessBody {
  email?: string
  full_name?: string
  phone?: string
  intended_role?: 'client' | 'speaker'
  // Client
  organization?: string
  use_case?: string
  expected_volume?: string
  target_languages?: string[]
  // Speaker
  speaker_languages?: string[]
  speaker_city?: string
  speaker_age_range?: string
  speaker_gender?: string
  speaker_motivation?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') return handlePreflight(corsHeaders)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    // Rate limit anti-spam : par IP, 5 demandes par heure
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    if (checkRateLimit(`request-access:${ip}`, { max: 5, windowSec: 3600 })) {
      return json({ error: 'Trop de demandes. Réessayez plus tard.' }, 429)
    }

    const body = (await req.json()) as RequestAccessBody

    // Validation
    const email = body.email?.trim().toLowerCase() ?? ''
    if (!EMAIL_REGEX.test(email)) {
      return json({ error: 'Email invalide' }, 400)
    }

    const fullName = body.full_name?.trim() ?? ''
    if (fullName.length < 2) {
      return json({ error: 'Nom complet requis (min 2 caractères)' }, 400)
    }

    const role = body.intended_role
    if (role !== 'client' && role !== 'speaker') {
      return json({ error: 'Rôle invalide' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Vérifier qu'il n'y a pas déjà une demande en attente pour cet email
    const { data: existing } = await admin
      .from('access_requests')
      .select('id, status')
      .eq('email', email)
      .in('status', ['pending', 'approved'])
      .limit(1)
      .maybeSingle() as unknown as {
        data: { id: string; status: string } | null
      }

    if (existing) {
      if (existing.status === 'approved') {
        return json({
          error: 'Cet email est déjà approuvé. Vérifiez votre boîte mail.',
        }, 409)
      }
      return json({
        error: 'Une demande est déjà en cours pour cet email. Vous serez recontacté.',
      }, 409)
    }

    // Vérifier que l'email n'est pas déjà whitelisté
    const { data: alreadyWhitelisted } = await admin
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .limit(1)
      .maybeSingle() as unknown as { data: { email: string } | null }

    if (alreadyWhitelisted) {
      return json({
        error: 'Cet email a déjà accès à Daandé. Connectez-vous ou créez votre compte.',
      }, 409)
    }

    // Construire la payload
    const payload: Record<string, unknown> = {
      email,
      full_name: fullName,
      intended_role: role,
      phone: body.phone?.trim() || null,
    }

    if (role === 'client') {
      payload.organization = body.organization?.trim() || null
      payload.use_case = body.use_case?.trim() || null
      payload.expected_volume = body.expected_volume?.trim() || null
      payload.target_languages = Array.isArray(body.target_languages) && body.target_languages.length > 0
        ? body.target_languages
        : null
    } else {
      payload.speaker_languages = Array.isArray(body.speaker_languages) && body.speaker_languages.length > 0
        ? body.speaker_languages
        : null
      payload.speaker_city = body.speaker_city?.trim() || null
      payload.speaker_age_range = body.speaker_age_range?.trim() || null
      payload.speaker_gender = body.speaker_gender?.trim() || null
      payload.speaker_motivation = body.speaker_motivation?.trim() || null
    }

    const { data: inserted, error: insertError } = await admin
      .from('access_requests')
      .insert(payload as never)
      .select('id')
      .single() as unknown as {
        data: { id: string } | null
        error: { message: string } | null
      }

    if (insertError || !inserted) {
      console.error('request-access insert error:', insertError)
      return json({ error: 'Erreur lors de la création de la demande' }, 500)
    }

    // Email de confirmation au demandeur (non-bloquant)
    void sendEmail(admin, {
      template: 'request_received',
      to: email,
      data: { full_name: fullName },
      relatedEntityType: 'access_request',
      relatedId: inserted.id,
    }).catch(e => console.error('[request-access] sendEmail failed:', e))

    return json({
      data: {
        request_id: inserted.id,
        message: 'Demande envoyée. Nous reviendrons vers vous sous 48h.',
      },
    })
  } catch (err) {
    console.error('request-access error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
