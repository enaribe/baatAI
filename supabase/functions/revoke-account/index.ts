import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'
import { sendEmail } from '../_shared/email.ts'

interface RevokeBody {
  user_id?: string
  reason?: string
  confirm?: string  // doit être "REVOQUER"
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

    const body = (await req.json()) as RevokeBody
    if (!body.user_id) return json({ error: 'user_id requis' }, 400)
    if (body.confirm !== 'REVOQUER') {
      return json({ error: 'Confirmation invalide. Tapez "REVOQUER" pour confirmer.' }, 400)
    }
    if (body.user_id === auth.userId) {
      return json({ error: 'Vous ne pouvez pas révoquer votre propre compte.' }, 400)
    }

    const { data: target } = await auth.admin
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', body.user_id)
      .single() as unknown as {
        data: { id: string; role: string; status: string; full_name: string | null } | null
      }
    if (!target) return json({ error: 'Utilisateur introuvable' }, 404)
    if (target.role === 'admin') {
      return json({ error: 'Impossible de révoquer un autre admin via cette interface.' }, 403)
    }

    // Pour speakers : bloque si retrait pending
    if (target.role === 'speaker') {
      const { count } = await auth.admin
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('speaker_id', body.user_id)
        .in('status', ['pending', 'approved']) as unknown as { count: number | null }
      if (count && count > 0) {
        return json({
          error: 'Le speaker a un retrait en cours. Traitez-le avant de révoquer le compte.',
        }, 400)
      }
    }

    // Marquer revoked + raison + audit
    const { error: updErr } = await auth.admin
      .from('profiles')
      .update({
        status: 'revoked',
        suspended_reason: body.reason?.trim() || null,
        suspended_at: new Date().toISOString(),
        suspended_by: auth.userId,
      } as never)
      .eq('id', body.user_id) as unknown as { error: { message: string } | null }

    if (updErr) {
      console.error('revoke-account update error:', updErr)
      return json({ error: 'Erreur lors de la révocation' }, 500)
    }

    // Force la déconnexion globale
    try {
      // @ts-expect-error : typage admin auth
      await auth.admin.auth.admin.signOut(body.user_id, 'global')
    } catch (e) {
      console.warn('signOut after revoke failed (non-blocking):', e)
    }

    // Whitelist : si l'email était whitelisté, on l'expire pour empêcher réinscription
    const { data: targetUser } = await auth.admin.auth.admin.getUserById(body.user_id) as unknown as {
      data: { user: { email?: string | null } | null }
    }
    const targetEmail = targetUser?.user?.email
    if (targetEmail) {
      await auth.admin
        .from('allowed_emails')
        .update({ expires_at: new Date(0).toISOString() } as never)
        .eq('email', targetEmail.toLowerCase())

      // Email de révocation (non-bloquant)
      void sendEmail(auth.admin, {
        template: 'account_revoked',
        to: targetEmail,
        data: {
          full_name: target.full_name ?? '',
          reason: body.reason ?? '',
        },
        userId: body.user_id,
        relatedEntityType: 'profile',
        relatedId: body.user_id,
      }).catch(e => console.error('[revoke] sendEmail failed:', e))
    }

    return json({ data: { user_id: body.user_id, status: 'revoked' } })
  } catch (err) {
    console.error('revoke-account error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
