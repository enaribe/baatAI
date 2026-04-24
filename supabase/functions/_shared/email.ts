// =============================================
// Helper d'envoi d'emails transactionnels via Resend
// =============================================
// Usage :
//   import { sendEmail } from '../_shared/email.ts'
//   await sendEmail(supabaseAdmin, {
//     template: 'request_approved',
//     to: 'aminata@orange.sn',
//     data: { full_name: 'Aminata', register_url: 'https://...' },
//     userId: '...',
//     relatedId: requestId,
//   })
//
// Variables d'env requises (Supabase Edge Functions Secrets) :
//   - RESEND_API_KEY   (clé API Resend, obligatoire)
//   - EMAIL_FROM       (optionnel, défaut: "Daandé <onboarding@resend.dev>")
//   - EMAIL_REPLY_TO   (optionnel, défaut: "papabdoulaye16@gmail.com")
//   - APP_URL          (optionnel, défaut: "https://daande.vercel.app")
// =============================================

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type EmailTemplate =
  | 'request_received'
  | 'request_approved'
  | 'request_rejected'
  | 'request_waitlist'
  | 'account_suspended'
  | 'account_revoked'

export interface SendEmailParams {
  template: EmailTemplate
  to: string
  data: Record<string, string>
  userId?: string | null
  relatedEntityType?: 'access_request' | 'profile'
  relatedId?: string | null
}

interface ResendResponse {
  id?: string
  message?: string
  name?: string
  statusCode?: number
}

const DEFAULT_FROM = 'Daandé <onboarding@resend.dev>'
const DEFAULT_REPLY_TO = 'papabdoulaye16@gmail.com'
const DEFAULT_APP_URL = 'https://daande.vercel.app'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function appUrl(): string {
  return Deno.env.get('APP_URL') ?? DEFAULT_APP_URL
}

// Wrapper HTML commun (header + footer)
function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1b1e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5ea;">
          <tr>
            <td style="padding:28px 32px 0;">
              <div style="font-size:18px;font-weight:600;color:#1a1b1e;letter-spacing:-0.3px;">Daandé</div>
              <div style="font-size:11px;color:#8a8f98;margin-top:2px;text-transform:uppercase;letter-spacing:0.08em;">Beta privée</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e5ea;background:#fafafa;font-size:12px;color:#8a8f98;">
              Daandé · Plateforme de datasets vocaux pour langues africaines<br>
              <a href="${appUrl()}" style="color:#5e6ad2;text-decoration:none;">${appUrl().replace(/^https?:\/\//, '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#1a1b1e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:510;letter-spacing:-0.2px;">${escapeHtml(label)}</a>`
}

// Construit subject + HTML pour un template donné
function buildEmail(template: EmailTemplate, data: Record<string, string>): { subject: string; html: string } {
  const name = data.full_name ?? 'Bonjour'
  const registerUrl = `${appUrl()}/register`

  switch (template) {
    case 'request_received': {
      const subject = 'Nous avons bien reçu votre demande'
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Demande reçue</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Nous avons bien reçu votre demande d'accès à Daandé. Notre équipe l'examine et reviendra vers vous sous <strong>48 heures</strong>.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Daandé est en beta privée : nous prenons le temps de bien onboarder chaque pilote pour garantir une expérience de qualité.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          À très vite,<br>L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }

    case 'request_approved': {
      const subject = 'Bienvenue sur Daandé — votre accès est ouvert'
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Votre accès est ouvert</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 24px;">
          Bonne nouvelle : votre demande a été approuvée. Vous pouvez créer votre compte dès maintenant avec l'email <strong>${escapeHtml(data.email ?? '')}</strong>.
        </p>
        <div style="margin:24px 0;">
          ${btn('Créer mon compte', registerUrl)}
        </div>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${registerUrl}" style="color:#5e6ad2;text-decoration:none;word-break:break-all;">${registerUrl}</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          À très vite,<br>L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }

    case 'request_rejected': {
      const subject = 'Concernant votre demande Daandé'
      const reason = data.rejection_reason
        ? `<p style="font-size:14px;line-height:1.6;color:#3a3d43;margin:0 0 16px;padding:12px 16px;background:#f5f5f7;border-radius:8px;border-left:3px solid #d4d4d8;">${escapeHtml(data.rejection_reason)}</p>`
        : ''
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Réponse à votre demande</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Merci pour l'intérêt que vous portez à Daandé. Nous ne pouvons pas donner suite à votre demande pour le moment.
        </p>
        ${reason}
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          N'hésitez pas à nous recontacter dans quelques mois lorsque la plateforme s'ouvrira plus largement.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }

    case 'request_waitlist': {
      const subject = 'Vous êtes sur notre liste d\'attente Daandé'
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Sur la liste d'attente</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Votre profil nous intéresse, mais nous n'avons pas encore de place disponible pour vous accueillir. Vous êtes sur notre liste d'attente.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Nous reviendrons vers vous dès qu'une place se libère. Cela peut prendre quelques semaines.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          Merci pour votre patience,<br>L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }

    case 'account_suspended': {
      const subject = 'Votre compte Daandé a été suspendu'
      const reason = data.reason
        ? `<p style="font-size:14px;line-height:1.6;color:#3a3d43;margin:0 0 16px;padding:12px 16px;background:#fef3c7;border-radius:8px;border-left:3px solid #fbbf24;">${escapeHtml(data.reason)}</p>`
        : ''
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Compte suspendu</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Votre accès à Daandé a été suspendu temporairement. Vous ne pouvez plus vous connecter pour le moment.
        </p>
        ${reason}
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Si vous pensez qu'il s'agit d'une erreur, contactez-nous en répondant à cet email.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }

    case 'account_revoked': {
      const subject = 'Votre compte Daandé a été désactivé'
      const reason = data.reason
        ? `<p style="font-size:14px;line-height:1.6;color:#3a3d43;margin:0 0 16px;padding:12px 16px;background:#fee2e2;border-radius:8px;border-left:3px solid #ef4444;">${escapeHtml(data.reason)}</p>`
        : ''
      const body = `
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;color:#1a1b1e;letter-spacing:-0.4px;">Compte désactivé</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Bonjour ${escapeHtml(name)},
        </p>
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Votre compte Daandé a été désactivé définitivement. Vous ne pouvez plus accéder à la plateforme avec cet email.
        </p>
        ${reason}
        <p style="font-size:15px;line-height:1.6;color:#3a3d43;margin:0 0 16px;">
          Pour toute question, vous pouvez répondre à cet email.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#8a8f98;margin:24px 0 0;">
          L'équipe Daandé
        </p>`
      return { subject, html: wrap(subject, body) }
    }
  }
}

/**
 * Envoie un email transactionnel via Resend.
 * Trace systématiquement l'envoi dans email_logs (pending → sent/failed).
 * Ne lève jamais d'exception : erreur loggée, retournée dans le résultat.
 */
export async function sendEmail(
  supabaseAdmin: SupabaseClient,
  params: SendEmailParams,
): Promise<{ ok: boolean; logId: string | null; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? DEFAULT_FROM
  const replyTo = Deno.env.get('EMAIL_REPLY_TO') ?? DEFAULT_REPLY_TO

  const { subject, html } = buildEmail(params.template, params.data)
  const recipient = params.to.trim().toLowerCase()

  // 1. Log pending (toujours, même si Resend pas configuré)
  const { data: logRow } = await supabaseAdmin
    .from('email_logs')
    .insert({
      recipient_email: recipient,
      recipient_user_id: params.userId ?? null,
      template: params.template,
      subject,
      related_entity_type: params.relatedEntityType ?? null,
      related_entity_id: params.relatedId ?? null,
      payload: params.data,
      status: 'pending',
      attempts: 0,
    } as never)
    .select('id')
    .single() as unknown as {
      data: { id: string } | null
      error: { message: string } | null
    }

  const logId = logRow?.id ?? null

  if (!apiKey) {
    const msg = 'RESEND_API_KEY non configuré'
    console.warn('[sendEmail]', msg)
    if (logId) {
      await supabaseAdmin
        .from('email_logs')
        .update({ status: 'failed', error_message: msg, attempts: 1 } as never)
        .eq('id', logId)
    }
    return { ok: false, logId, error: msg }
  }

  // 2. Appel Resend
  let resendRes: ResendResponse = {}
  let httpStatus = 0
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: replyTo,
        subject,
        html,
      }),
    })
    httpStatus = res.status
    resendRes = await res.json() as ResendResponse
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau Resend'
    console.error('[sendEmail] fetch error:', msg)
    if (logId) {
      await supabaseAdmin
        .from('email_logs')
        .update({ status: 'failed', error_message: msg, attempts: 1 } as never)
        .eq('id', logId)
    }
    return { ok: false, logId, error: msg }
  }

  // 3. Update log selon résultat
  if (httpStatus >= 200 && httpStatus < 300 && resendRes.id) {
    if (logId) {
      await supabaseAdmin
        .from('email_logs')
        .update({
          status: 'sent',
          resend_message_id: resendRes.id,
          sent_at: new Date().toISOString(),
          attempts: 1,
        } as never)
        .eq('id', logId)
    }
    return { ok: true, logId }
  }

  const errorMsg = resendRes.message ?? `HTTP ${httpStatus}`
  console.error('[sendEmail] Resend error:', httpStatus, resendRes)
  if (logId) {
    await supabaseAdmin
      .from('email_logs')
      .update({
        status: 'failed',
        error_message: errorMsg,
        attempts: 1,
      } as never)
      .eq('id', logId)
  }
  return { ok: false, logId, error: errorMsg }
}
