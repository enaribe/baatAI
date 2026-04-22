import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Loader2, ArrowLeft, Mic, Clock, X, Check, AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { useInvitationDetail } from '../hooks/use-invitation-detail'
import { supabase } from '../lib/supabase'
import { getLanguageLabel } from '../lib/languages'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

const fcfa = (n: number | null | undefined) =>
  !n ? '0' : new Intl.NumberFormat('fr-SN').format(n)

export function SpeakerInvitationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { invitation, loading, error, refetch } = useInvitationDetail(id)
  const [action, setAction] = useState<'idle' | 'accepting' | 'declining' | 'starting'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="max-w-[720px] mx-auto px-5 lg:px-8 py-10">
        <Link
          to="/speaker/invitations"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors mb-6"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Retour aux invitations
        </Link>
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
          style={sans}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error ?? 'Cette invitation n\'existe pas ou vous n\'y avez pas accès.'}</span>
        </div>
      </div>
    )
  }

  const {
    project, status, message, expires_at, rate_snapshot_fcfa,
    estimated_duration_minutes, phrase_count, preview_phrases, inviter_name,
  } = invitation
  const rate = rate_snapshot_fcfa ?? project?.rate_per_hour_fcfa ?? 0
  const totalEstimated = estimated_duration_minutes && rate
    ? Math.round((estimated_duration_minutes / 60) * rate)
    : null

  const expiresDate = new Date(expires_at)
  const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysLeft <= 3 && daysLeft > 0 && status === 'pending'
  const isExpired = status === 'expired' || (daysLeft <= 0 && status === 'pending')

  const code = `INV-${invitation.id.slice(0, 4).toUpperCase()}`

  const decline = async () => {
    setAction('declining')
    setActionError(null)
    const { error: err } = await (supabase
      .from('project_invitations')
      .update({ status: 'declined', responded_at: new Date().toISOString() } as unknown as never)
      .eq('id', invitation.id) as unknown as Promise<{ error: { message: string } | null }>)
    if (err) { setActionError(err.message); setAction('idle'); return }
    await refetch(); setAction('idle')
  }

  const accept = async () => {
    setAction('accepting')
    setActionError(null)
    const { error: err } = await (supabase
      .from('project_invitations')
      .update({ status: 'accepted', responded_at: new Date().toISOString() } as unknown as never)
      .eq('id', invitation.id) as unknown as Promise<{ error: { message: string } | null }>)
    if (err) { setActionError(err.message); setAction('idle'); return }
    await refetch(); setAction('idle')
  }

  const start = async () => {
    setAction('starting')
    setActionError(null)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setActionError('Session expirée'); setAction('idle'); return }
    const res = await fetch(`${supabaseUrl}/functions/v1/accept-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ project_id: invitation.project_id, invitation_id: invitation.id }),
    })
    const json = (await res.json()) as { data?: { session_id: string }; error?: string }
    if (json.error || !json.data?.session_id) {
      setActionError(json.error ?? 'Erreur lors du démarrage')
      setAction('idle')
      return
    }
    navigate(`/speaker/record/${json.data.session_id}`)
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to="/speaker/invitations"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Invitations
        </Link>
        <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {code}
        </span>
      </header>

      <div className="max-w-[1040px] mx-auto px-5 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
          {/* Main */}
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-[#f7f8f8]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Mic className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="text-[24px] text-[#f7f8f8] m-0"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '-0.3px', lineHeight: 1.2 }}
                >
                  {project?.name ?? 'Projet'}
                </h1>
                <p className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
                  {project?.language_label ?? getLanguageLabel(project?.target_language ?? '')}
                  {project?.funding_source && (
                    <>
                      <span className="mx-2 text-[#3e3e44]">·</span>
                      <span className="text-[#d0d6e0]">{project.funding_source}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Alertes */}
            {isExpiringSoon && (
              <div
                className="mt-6 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
                style={{
                  ...sans,
                  color: '#fbbf24',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.22)',
                }}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
              </div>
            )}
            {isExpired && (
              <div
                className="mt-6 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
                style={{
                  ...sans,
                  color: '#8a8f98',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                Cette invitation a expiré
              </div>
            )}

            {/* Description */}
            {project?.description && (
              <section className="mt-8">
                <div
                  className="text-[11px] text-[#62666d] uppercase mb-2"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                >
                  Description
                </div>
                <p className="text-[14px] text-[#d0d6e0] leading-relaxed" style={sans}>
                  {project.description}
                </p>
              </section>
            )}

            {/* Message du client */}
            {message && (
              <section
                className="mt-8 pl-4"
                style={{ borderLeft: '2px solid rgba(255,255,255,0.15)' }}
              >
                <div
                  className="text-[11px] text-[#62666d] uppercase mb-2"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                >
                  Message du client
                </div>
                <p className="text-[14px] text-[#d0d6e0] leading-relaxed italic" style={sans}>
                  « {message} »
                </p>
              </section>
            )}

            {/* Preview phrases */}
            {preview_phrases.length > 0 && (
              <section className="mt-8">
                <div
                  className="text-[11px] text-[#62666d] uppercase mb-3"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                >
                  Aperçu des phrases ({preview_phrases.length})
                </div>
                <div
                  className="rounded-[8px] p-4 max-h-[320px] overflow-y-auto relative"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex flex-col gap-2">
                    {preview_phrases.map((p, i) => (
                      <div key={p.id} className="flex gap-3 items-start">
                        <span
                          className="text-[10px] text-[#62666d] tabular-nums mt-0.5 shrink-0 w-6"
                          style={mono}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-[13px] text-[#d0d6e0] leading-relaxed flex-1" style={sans}>
                          {p.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Error action */}
            {actionError && (
              <div
                className="mt-6 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
                style={sans}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Actions desktop */}
            {status === 'pending' && !isExpired && (
              <div className="mt-8 flex gap-2 flex-wrap">
                <button
                  onClick={decline}
                  disabled={action !== 'idle'}
                  className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] rounded-md transition-colors disabled:opacity-40"
                  style={{
                    ...sans,
                    fontWeight: 510,
                    color: '#d0d6e0',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {action === 'declining' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  Décliner
                </button>
                <button
                  onClick={accept}
                  disabled={action !== 'idle'}
                  className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] rounded-md transition-colors disabled:opacity-40"
                  style={{
                    ...sans,
                    fontWeight: 510,
                    color: '#f7f8f8',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {action === 'accepting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  Accepter plus tard
                </button>
                <button
                  onClick={start}
                  disabled={action !== 'idle'}
                  className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] rounded-md transition-colors disabled:opacity-40 ml-auto"
                  style={{
                    ...sans,
                    fontWeight: 510,
                    color: '#f7f8f8',
                    background: '#5e6ad2',
                  }}
                >
                  {action === 'starting' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Commencer maintenant
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </>
                  )}
                </button>
              </div>
            )}

            {status === 'accepted' && (
              <div className="mt-8">
                <button
                  onClick={start}
                  disabled={action !== 'idle'}
                  className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[13px] rounded-md transition-colors disabled:opacity-40"
                  style={{
                    ...sans,
                    fontWeight: 510,
                    color: '#f7f8f8',
                    background: '#5e6ad2',
                  }}
                >
                  {action === 'starting' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Commencer l'enregistrement
                    </>
                  )}
                </button>
              </div>
            )}

            {status === 'declined' && (
              <p className="mt-8 text-[13px] text-[#8a8f98]" style={sans}>
                Vous avez décliné cette invitation.
              </p>
            )}
            {status === 'cancelled' && (
              <p className="mt-8 text-[13px] text-[#8a8f98]" style={sans}>
                Cette invitation a été annulée par le client.
              </p>
            )}
          </div>

          {/* Side panel */}
          <aside>
            <div
              className="rounded-[10px]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <MetaRow label="Statut">
                <StatusPill status={status} />
              </MetaRow>
              {inviter_name && (
                <>
                  <MetaDivider />
                  <MetaRow label="Invité par" value={inviter_name} />
                </>
              )}
              <MetaDivider />
              <MetaRow label="Phrases" value={String(phrase_count)} />
              <MetaDivider />
              <MetaRow label="Durée" value={formatDuration(estimated_duration_minutes)} />
              {rate > 0 && (
                <>
                  <MetaDivider />
                  <MetaRow label="Tarif" value={`${fcfa(rate)} FCFA/h`} isMono />
                </>
              )}
              {totalEstimated && (
                <>
                  <MetaDivider />
                  <MetaRow label="Gain estimé" value={`${fcfa(totalEstimated)} FCFA`} isMono />
                </>
              )}
              <MetaDivider />
              <MetaRow
                label="Expire"
                value={expiresDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                isMono
              />
            </div>

            {project?.required_languages && project.required_languages.length > 0 && (
              <div className="mt-4">
                <div
                  className="text-[11px] text-[#62666d] uppercase mb-2"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                >
                  Langues requises
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {project.required_languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px]"
                      style={{
                        ...sans,
                        fontWeight: 510,
                        color: '#d0d6e0',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {getLanguageLabel(lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ---------- Helpers ---------- */

function MetaRow({
  label, value, children, isMono,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  isMono?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span
        className="text-[11px] text-[#62666d] uppercase"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {label}
      </span>
      {children ? (
        children
      ) : (
        <span
          className="text-[13px] text-[#f7f8f8]"
          style={isMono ? mono : { ...sans, fontWeight: 510 }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function MetaDivider() {
  return <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'En attente', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
    accepted: { label: 'Acceptée', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    declined: { label: 'Déclinée', color: '#8a8f98', bg: 'rgba(255,255,255,0.04)' },
    expired: { label: 'Expirée', color: '#8a8f98', bg: 'rgba(255,255,255,0.04)' },
    cancelled: { label: 'Annulée', color: '#8a8f98', bg: 'rgba(255,255,255,0.04)' },
  }
  const s = map[status] ?? map.pending!
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
      style={{
        ...sans,
        fontWeight: 510,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
