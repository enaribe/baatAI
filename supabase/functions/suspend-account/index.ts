import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'
import { sendEmail } from '../_shared/email.ts'

interface SuspendBody {
  user_id?: string
  reason?: string
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

    const body = (await req.json()) as SuspendBody
    if (!body.user_id) return json({ error: 'user_id requis' }, 400)

    // Garde-fou : ne pas se suspendre soi-même
    if (body.user_id === auth.userId) {
      return json({ error: 'Vous ne pouvez pas vous suspendre vous-même.' }, 400)
    }

    // Vérifier que la cible n'est pas un autre admin
    const { data: target } = await auth.admin
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', body.user_id)
      .single() as unknown as {
        data: { id: string; role: string; status: string; full_name: string | null } | null
      }
    if (!target) return json({ error: 'Utilisateur introuvable' }, 404)
    if (target.role === 'admin') {
      return json({ error: 'Impossible de suspendre un autre admin via cette interface.' }, 403)
    }
    if (target.status === 'suspended') {
      return json({ error: 'Compte déjà suspendu' }, 400)
    }
    if (target.status === 'revoked') {
      return json({ error: 'Compte révoqué : impossible de le suspendre' }, 400)
    }

    const { error: updErr } = await auth.admin
      .from('profiles')
      .update({
        status: 'suspended',
        suspended_reason: body.reason?.trim() || null,
        suspended_at: new Date().toISOString(),
        suspended_by: auth.userId,
      } as never)
      .eq('id', body.user_id) as unknown as { error: { message: string } | null }

    if (updErr) {
      console.error('suspend-account update error:', updErr)
      return json({ error: 'Erreur lors de la suspension' }, 500)
    }

    // Force la déconnexion en supprimant les sessions actives
    try {
      // @ts-expect-error : typage admin auth
      await auth.admin.auth.admin.signOut(body.user_id, 'global')
    } catch (e) {
      console.warn('signOut after suspend failed (non-blocking):', e)
    }

    // Email de suspension (non-bloquant) — on récupère l'email via auth admin
    try {
      // @ts-expect-error : typage admin auth
      const { data: userInfo } = await auth.admin.auth.admin.getUserById(body.user_id)
      const targetEmail = userInfo?.user?.email
      if (targetEmail) {
        void sendEmail(auth.admin, {
          template: 'account_suspended',
          to: targetEmail,
          data: {
            full_name: target.full_name ?? '',
            reason: body.reason ?? '',
          },
          userId: body.user_id,
          relatedEntityType: 'profile',
          relatedId: body.user_id,
        }).catch(e => console.error('[suspend] sendEmail failed:', e))
      }
    } catch (e) {
      console.warn('[suspend] getUserById failed:', e)
    }

    return json({ data: { user_id: body.user_id, status: 'suspended' } })
  } catch (err) {
    console.error('suspend-account error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
