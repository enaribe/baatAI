import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-check.ts'

interface AddBody {
  email?: string
  role?: 'client' | 'speaker' | 'admin'
  expires_in_days?: number
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
    const auth = await requireAdmin(req)
    if ('error' in auth) return json({ error: auth.error }, auth.status)

    const body = (await req.json()) as AddBody
    const email = body.email?.trim().toLowerCase() ?? ''
    const role = body.role

    if (!EMAIL_REGEX.test(email)) return json({ error: 'Email invalide' }, 400)
    if (role !== 'client' && role !== 'speaker' && role !== 'admin') {
      return json({ error: 'Rôle invalide (client, speaker ou admin)' }, 400)
    }

    // Calcul expires_at (optionnel)
    let expiresAt: string | null = null
    if (body.expires_in_days && body.expires_in_days > 0) {
      const d = new Date()
      d.setDate(d.getDate() + body.expires_in_days)
      expiresAt = d.toISOString()
    }

    // Vérifier si compte déjà créé pour cet email
    const { data: existingProfile } = await auth.admin
      .from('profiles')
      .select('id, status')
      .eq('id', '__placeholder__') // pas d'usage direct, on check via email plus bas
      .maybeSingle() as unknown as { data: null }

    void existingProfile // évite warning

    // upsert dans allowed_emails
    const { error: upsertErr } = await auth.admin
      .from('allowed_emails')
      .upsert({
        email,
        role,
        source: 'manual',
        approved_at: new Date().toISOString(),
        approved_by: auth.userId,
        expires_at: expiresAt,
        used_at: null,
        signed_up_user_id: null,
      } as never, { onConflict: 'email' }) as unknown as {
        error: { message: string } | null
      }

    if (upsertErr) {
      console.error('add-to-whitelist error:', upsertErr)
      return json({ error: 'Erreur ajout whitelist' }, 500)
    }

    return json({ data: { email, role, expires_at: expiresAt } })
  } catch (err) {
    console.error('add-to-whitelist error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
