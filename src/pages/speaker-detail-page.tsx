import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, ShieldCheck, Star, MapPin, Mic, Loader2,
  AlertTriangle, UserPlus, X, Check, Users, Volume2,
} from 'lucide-react'
import { useSpeakerDetail } from '../hooks/use-speakers'
import { useProjects } from '../hooks/use-projects'
import { useToast } from '../hooks/use-toast'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import { StaticWaveform } from '../components/ui/static-waveform'
import { SpeakerSamplePlayer } from '../components/speaker-sample-player'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function SpeakerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { speaker, loading, error, toggleFavorite } = useSpeakerDetail(id)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
      </div>
    )
  }

  if (error || !speaker) {
    return (
      <div className="min-h-screen px-5 lg:px-8 py-10">
        <Link
          to="/speakers"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors mb-6"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Retour aux locuteurs
        </Link>
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
          style={sans}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error ?? 'Locuteur introuvable.'}</span>
        </div>
      </div>
    )
  }

  const fullName = speaker.full_name ?? 'Locuteur'
  const initials = fullName.split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase() || '?'
  const reliability = Math.round(speaker.reliability_score * 100)
  const age = speaker.date_of_birth
    ? Math.floor((Date.now() - new Date(speaker.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null
  const genderLabel = speaker.gender === 'male' ? 'Homme'
    : speaker.gender === 'female' ? 'Femme'
    : speaker.gender === 'other' ? 'Autre' : '—'

  const code = `SPK-${speaker.speaker_id.slice(0, 4).toUpperCase()}`

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to="/speakers"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Locuteurs
        </Link>
        <span className="text-[#3e3e44]">/</span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {code}
        </span>
        <span className="text-[13px] text-[#f7f8f8] truncate" style={{ ...sans, fontWeight: 510 }}>
          {fullName}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggleFavorite}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: speaker.is_favorite ? 'var(--t-danger-text)' : 'var(--t-fg-2)',
              background: speaker.is_favorite ? 'var(--t-danger-muted-bg)' : 'var(--t-surface)',
              border: `1px solid ${speaker.is_favorite ? 'var(--t-danger-muted-border)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Heart
              className="w-3 h-3"
              strokeWidth={1.75}
              style={{
                color: speaker.is_favorite ? 'var(--t-danger)' : undefined,
                fill: speaker.is_favorite ? 'var(--t-danger)' : 'none',
              }}
            />
            {speaker.is_favorite ? 'Favori' : 'Ajouter aux favoris'}
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#ffffff',
              background: '#5e6ad2',
            }}
          >
            <UserPlus className="w-3 h-3" strokeWidth={1.75} />
            Inviter sur un projet
          </button>
        </div>
      </header>

      <div className="max-w-[1040px] mx-auto px-5 lg:px-8 py-8">
        {/* Hero */}
        <div
          data-theme="dark"
          className="relative rounded-[12px] overflow-hidden mb-6"
          style={{
            background: '#0f1011',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f7f8f8',
          }}
        >
          <div
            className="relative aspect-[5/1.4] overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(113,112,255,0.06) 0%, rgba(255,255,255,0) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <StaticWaveform seed={speaker.speaker_id} bars={96} maxOpacity={0.45} />
          </div>

          <div className="relative px-6 pb-6 -mt-10 flex flex-col sm:flex-row sm:items-end sm:gap-5">
            {/* Avatar */}
            <div
              className="w-[72px] h-[72px] rounded-[14px] flex items-center justify-center text-[24px] shrink-0"
              style={{
                background: '#3e3e44',
                color: '#f7f8f8',
                border: '3px solid #0f1011',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                ...sans,
                fontWeight: 590,
              }}
            >
              {speaker.avatar_url
                ? <img src={speaker.avatar_url} alt="" className="w-full h-full rounded-[11px] object-cover" />
                : initials}
            </div>

            <div className="flex-1 min-w-0 mt-3 sm:mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-[24px] text-[#f7f8f8] m-0"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '-0.3px', lineHeight: 1.2 }}
                >
                  {fullName}
                </h1>
                {speaker.is_certified && (
                  <span
                    className="inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px]"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      color: '#10b981',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.22)',
                    }}
                  >
                    <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                    Certifié
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[#8a8f98] flex-wrap" style={sans}>
                {speaker.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" strokeWidth={1.75} />
                    {speaker.city}
                  </span>
                )}
                {speaker.city && <span className="text-[#3e3e44]">·</span>}
                <span>{genderLabel}</span>
                {age != null && (
                  <>
                    <span className="text-[#3e3e44]">·</span>
                    <span style={mono}>{age} ans</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Voice sample player */}
        {speaker.sample_storage_path ? (
          <div className="mb-6">
            <SpeakerSamplePlayer
              storagePath={speaker.sample_storage_path}
              durationSeconds={speaker.sample_duration_seconds}
              variant="full"
            />
          </div>
        ) : (
          <div
            className="mb-6 flex items-center gap-3 px-4 py-3 rounded-[10px]"
            style={{
              background: 'var(--t-surface)',
              border: '1px dashed rgba(255,255,255,0.12)',
            }}
          >
            <Volume2 className="w-3.5 h-3.5 text-[#62666d]" strokeWidth={1.75} />
            <span className="text-[12px] text-[#8a8f98]" style={sans}>
              Ce locuteur n'a pas encore publié d'échantillon de voix.
            </span>
          </div>
        )}

        {/* Stats + side info */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="min-w-0">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Enregistrements"
                value={String(speaker.total_recordings)}
              />
              <StatCard
                label="Validés"
                value={String(speaker.total_validated)}
                accent="var(--t-success)"
              />
              <StatCard
                label="Fiabilité"
                value={`${reliability}%`}
                icon={<Star className="w-3 h-3 text-[#fbbf24]" strokeWidth={2} />}
              />
              <StatCard
                label="Minutes audio"
                value={String(Math.round(speaker.total_duration_seconds / 60))}
              />
            </div>

            {/* Bio */}
            {speaker.bio && (
              <section className="mb-6">
                <div
                  className="text-[11px] text-[#62666d] uppercase mb-2"
                  style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                >
                  Présentation
                </div>
                <p className="text-[14px] text-[#d0d6e0] leading-relaxed" style={sans}>
                  {speaker.bio}
                </p>
              </section>
            )}

            {/* Langues + dialectes */}
            <section>
              <div
                className="text-[11px] text-[#62666d] uppercase mb-2"
                style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
              >
                Langues et dialectes
              </div>
              <div className="flex flex-col gap-2.5">
                {speaker.languages.map((code) => {
                  const lang = LANGUAGES[code]
                  const dialects = speaker.dialects?.[code] ?? []
                  return (
                    <div
                      key={code}
                      className="rounded-md p-3"
                      style={{
                        background: 'var(--t-surface)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[13px] text-[#f7f8f8]"
                          style={{ ...sans, fontWeight: 510 }}
                        >
                          {lang?.label ?? code}
                        </span>
                        <span className="text-[11px] text-[#62666d]" style={mono}>
                          {dialects.length}/{lang?.dialects.length ?? 0} dialectes
                        </span>
                      </div>
                      {dialects.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {dialects.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center px-2 h-[20px] rounded-full text-[10px] text-[#d0d6e0]"
                              style={{
                                ...sans,
                                fontWeight: 510,
                                background: 'var(--t-surface-hover)',
                                border: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {speaker.languages.length === 0 && (
                  <p className="text-[13px] text-[#62666d]" style={sans}>
                    Aucune langue renseignée.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Side panel */}
          <aside>
            <div
              className="rounded-[10px]"
              style={{
                background: 'var(--t-surface)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <MetaRow label="Code" value={code} mono />
              <MetaDivider />
              <MetaRow label="Pays" value={speaker.country || '—'} />
              <MetaDivider />
              <MetaRow
                label="Inscrit"
                value={new Date(speaker.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                mono
              />
              <MetaDivider />
              <MetaRow
                label="Vos projets"
                value={String(speaker.shared_projects_count)}
                hint={speaker.shared_projects_count > 0 ? 'déjà partagés' : ''}
              />
            </div>

            {speaker.shared_projects_count > 0 && (
              <div
                className="mt-4 px-4 py-3 rounded-md"
                style={{
                  background: 'var(--t-accent-muted-bg)',
                  border: '1px solid var(--t-accent-muted-border)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3 h-3 text-[#828fff]" strokeWidth={1.75} />
                  <span
                    className="text-[11px] text-[#828fff] uppercase"
                    style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
                  >
                    Déjà collaboré
                  </span>
                </div>
                <p className="text-[12px] text-[#d0d6e0]" style={sans}>
                  Ce locuteur a participé à <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>{speaker.shared_projects_count}</span> de vos projets.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Modal invite */}
      {inviteOpen && (
        <InviteToProjectModal
          speakerId={speaker.speaker_id}
          speakerName={fullName}
          onClose={() => setInviteOpen(false)}
          onInvited={() => { setInviteOpen(false); navigate('/dashboard') }}
        />
      )}
    </div>
  )
}

/* ---------- StatCard ---------- */

function StatCard({
  label, value, icon, accent,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  accent?: string
}) {
  return (
    <div
      className="rounded-[10px] p-3.5"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p
        className="text-[10px] text-[#62666d] uppercase mb-1.5"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        {icon}
        <span
          className="text-[20px] tabular-nums"
          style={{
            ...sans,
            fontWeight: 590,
            color: accent ?? 'var(--t-fg)',
            letterSpacing: '-0.3px',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

/* ---------- Meta rows ---------- */

function MetaRow({
  label, value, mono: isMono, hint,
}: {
  label: string
  value: string
  mono?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-3">
      <span
        className="text-[11px] text-[#62666d] uppercase shrink-0"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {label}
      </span>
      <div className="text-right min-w-0">
        <span
          className="text-[13px] text-[#f7f8f8] truncate block"
          style={isMono ? mono : { ...sans, fontWeight: 510 }}
        >
          {value}
        </span>
        {hint && (
          <span className="text-[10px] text-[#62666d]" style={sans}>
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}

function MetaDivider() {
  return <div className="h-px mx-4" style={{ background: 'var(--t-border-subtle)' }} />
}

/* ---------- Modal invite to project ---------- */

function InviteToProjectModal({
  speakerId, speakerName, onClose, onInvited,
}: {
  speakerId: string
  speakerName: string
  onClose: () => void
  onInvited: () => void
}) {
  const { projects, loading } = useProjects()
  const { notify } = useToast()
  const [sendingId, setSendingId] = useState<string | null>(null)

  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'draft' || p.status === 'processing',
  )

  const handleInvite = async (projectId: string) => {
    setSendingId(projectId)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSendingId(null); return }

    const res = await fetch(`${supabaseUrl}/functions/v1/invite-speaker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ project_id: projectId, speaker_id: speakerId }),
    })
    const json = (await res.json()) as { data?: unknown; error?: string }
    setSendingId(null)

    if (json.error) {
      notify({ variant: 'error', title: 'Échec', message: json.error })
    } else {
      notify({
        variant: 'success',
        title: 'Invitation envoyée',
        message: `${speakerName} a été invité·e sur ce projet.`,
      })
      onInvited()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-[12px] w-full max-w-[480px] max-h-[80vh] flex flex-col"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
          <div>
            <h2
              className="text-[15px] text-[#f7f8f8] m-0"
              style={{ ...sans, fontWeight: 590 }}
            >
              Inviter {speakerName}
            </h2>
            <p className="text-[12px] text-[#8a8f98] mt-0.5" style={sans}>
              Sélectionnez un projet
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#8a8f98]" />
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Mic className="w-6 h-6 text-[#8a8f98] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-[#8a8f98] mb-4" style={sans}>
                Aucun projet actif. Créez-en un d'abord.
              </p>
              <Link
                to="/project/new"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[13px] rounded-md"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#ffffff',
                  background: '#5e6ad2',
                }}
              >
                Créer un projet
              </Link>
            </div>
          ) : (
            <div>
              {activeProjects.map((p) => {
                const code = `BAA-${p.id.slice(0, 4).toUpperCase()}`
                return (
                  <button
                    key={p.id}
                    onClick={() => handleInvite(p.id)}
                    disabled={sendingId === p.id}
                    className="w-full flex items-center gap-3 px-5 py-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors text-left disabled:opacity-50"
                  >
                    <span className="text-[11px] text-[#62666d] w-[70px] shrink-0" style={mono}>
                      {code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] text-[#f7f8f8] truncate"
                        style={{ ...sans, fontWeight: 510 }}
                      >
                        {p.name}
                      </p>
                      <p className="text-[11px] text-[#8a8f98]" style={sans}>
                        {p.language_label ?? p.target_language}
                      </p>
                    </div>
                    {sendingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8a8f98]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-[#62666d] opacity-0 group-hover:opacity-100" strokeWidth={2} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
