import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'
import { sendEmail } from '../_shared/email.ts'

interface ApproveBody {
  request_id?: string
  admin_notes?: string
}

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
    const auth = await requireAdmin(req)
    if ('error' in auth) return json({ error: auth.error }, auth.status)

    const body = (await req.json()) as ApproveBody
    if (!body.request_id) return json({ error: 'request_id requis' }, 400)

    // 1) Charger la demande
    const { data: request, error: loadErr } = await auth.admin
      .from('access_requests')
      .select('id, email, full_name, intended_role, status')
      .eq('id', body.request_id)
      .single() as unknown as {
        data: { id: string; email: string; full_name: string; intended_role: string; status: string } | null
        error: { message: string } | null
      }

    if (loadErr || !request) return json({ error: 'Demande introuvable' }, 404)
    if (request.status !== 'pending' && request.status !== 'waitlist') {
      return json({ error: `Demande déjà traitée (status: ${request.status})` }, 400)
    }

    // 2) Ajouter à la whitelist (ON CONFLICT DO UPDATE pour idempotence)
    const { error: insertErr } = await auth.admin
      .from('allowed_emails')
      .upsert({
        email: request.email,
        role: request.intended_role,
        source: 'request',
        request_id: request.id,
        approved_at: new Date().toISOString(),
        approved_by: auth.userId,
        used_at: null,
        signed_up_user_id: null,
      } as never, { onConflict: 'email' }) as unknown as {
        error: { message: string } | null
      }

    if (insertErr) {
      console.error('approve-access-request whitelist error:', insertErr)
      return json({ error: 'Erreur ajout whitelist' }, 500)
    }

    // 3) Mettre à jour la demande
    const { error: updateErr } = await auth.admin
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.userId,
        admin_notes: body.admin_notes ?? null,
      } as never)
      .eq('id', request.id) as unknown as {
        error: { message: string } | null
      }

    if (updateErr) {
      console.error('approve-access-request update error:', updateErr)
      return json({ error: 'Erreur mise à jour demande' }, 500)
    }

    // Email d'approbation (non-bloquant)
    void sendEmail(auth.admin, {
      template: 'request_approved',
      to: request.email,
      data: {
        full_name: request.full_name,
        email: request.email,
      },
      relatedEntityType: 'access_request',
      relatedId: request.id,
    }).catch(e => console.error('[approve] sendEmail failed:', e))

    return json({
      data: {
        request_id: request.id,
        email: request.email,
        role: request.intended_role,
        invite_url: '/register',
      },
    })
  } catch (err) {
    console.error('approve-access-request error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
