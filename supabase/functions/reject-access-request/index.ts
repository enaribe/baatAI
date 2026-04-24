import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'
import { sendEmail } from '../_shared/email.ts'

interface RejectBody {
  request_id?: string
  rejection_reason?: string
  status?: 'rejected' | 'waitlist'
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

    const body = (await req.json()) as RejectBody
    if (!body.request_id) return json({ error: 'request_id requis' }, 400)

    const targetStatus = body.status === 'waitlist' ? 'waitlist' : 'rejected'

    const { data: request, error: loadErr } = await auth.admin
      .from('access_requests')
      .select('id, email, full_name, status')
      .eq('id', body.request_id)
      .single() as unknown as {
        data: { id: string; email: string; full_name: string; status: string } | null
        error: { message: string } | null
      }

    if (loadErr || !request) return json({ error: 'Demande introuvable' }, 404)
    if (request.status === 'approved') {
      return json({ error: 'Demande déjà approuvée. Révoquez d\'abord la whitelist.' }, 400)
    }

    const { error: updateErr } = await auth.admin
      .from('access_requests')
      .update({
        status: targetStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.userId,
        rejection_reason: body.rejection_reason ?? null,
        admin_notes: body.admin_notes ?? null,
      } as never)
      .eq('id', request.id) as unknown as {
        error: { message: string } | null
      }

    if (updateErr) {
      console.error('reject-access-request update error:', updateErr)
      return json({ error: 'Erreur mise à jour demande' }, 500)
    }

    // Email selon le statut (non-bloquant)
    void sendEmail(auth.admin, {
      template: targetStatus === 'waitlist' ? 'request_waitlist' : 'request_rejected',
      to: request.email,
      data: {
        full_name: request.full_name,
        rejection_reason: body.rejection_reason ?? '',
      },
      relatedEntityType: 'access_request',
      relatedId: request.id,
    }).catch(e => console.error('[reject] sendEmail failed:', e))

    return json({
      data: { request_id: request.id, status: targetStatus },
    })
  } catch (err) {
    console.error('reject-access-request error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
