import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'

interface ReactivateBody {
  user_id?: string
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

    const body = (await req.json()) as ReactivateBody
    if (!body.user_id) return json({ error: 'user_id requis' }, 400)

    const { data: target } = await auth.admin
      .from('profiles')
      .select('id, status')
      .eq('id', body.user_id)
      .single() as unknown as {
        data: { id: string; status: string } | null
      }
    if (!target) return json({ error: 'Utilisateur introuvable' }, 404)
    if (target.status === 'active') {
      return json({ error: 'Compte déjà actif' }, 400)
    }
    if (target.status === 'revoked') {
      return json({ error: 'Compte révoqué : impossible de le réactiver' }, 400)
    }

    const { error: updErr } = await auth.admin
      .from('profiles')
      .update({
        status: 'active',
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      } as never)
      .eq('id', body.user_id) as unknown as { error: { message: string } | null }

    if (updErr) {
      console.error('reactivate-account update error:', updErr)
      return json({ error: 'Erreur lors de la réactivation' }, 500)
    }

    return json({ data: { user_id: body.user_id, status: 'active' } })
  } catch (err) {
    console.error('reactivate-account error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
