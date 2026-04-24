import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'

interface RevokeBody {
  email?: string
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
    const email = body.email?.trim().toLowerCase() ?? ''
    if (!email) return json({ error: 'email requis' }, 400)

    // Sécurité : ne pas se révoquer soi-même
    if (email === auth.email.toLowerCase()) {
      return json({ error: 'Vous ne pouvez pas révoquer votre propre accès.' }, 400)
    }

    // Charger pour vérifier si l'utilisateur s'est déjà inscrit
    const { data: entry } = await auth.admin
      .from('allowed_emails')
      .select('email, used_at, signed_up_user_id')
      .eq('email', email)
      .maybeSingle() as unknown as {
        data: { email: string; used_at: string | null; signed_up_user_id: string | null } | null
      }

    if (!entry) return json({ error: 'Email introuvable dans la whitelist' }, 404)

    // Si déjà utilisé : on ne supprime pas (briserait la FK), on bloque la réinscription en mettant expires_at au passé
    if (entry.used_at) {
      const { error: updErr } = await auth.admin
        .from('allowed_emails')
        .update({
          expires_at: new Date(0).toISOString(),
        } as never)
        .eq('email', email) as unknown as {
          error: { message: string } | null
        }
      if (updErr) {
        console.error('revoke-whitelist update error:', updErr)
        return json({ error: 'Erreur révocation' }, 500)
      }
      return json({ data: { email, mode: 'expired' } })
    }

    // Sinon on supprime franchement (invitation jamais utilisée)
    const { error: delErr } = await auth.admin
      .from('allowed_emails')
      .delete()
      .eq('email', email) as unknown as {
        error: { message: string } | null
      }

    if (delErr) {
      console.error('revoke-whitelist delete error:', delErr)
      return json({ error: 'Erreur suppression' }, 500)
    }

    return json({ data: { email, mode: 'deleted' } })
  } catch (err) {
    console.error('revoke-whitelist error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
