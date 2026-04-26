import { useState, useEffect, useMemo } from 'react'
import {
  Headphones, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Search, Filter,
} from 'lucide-react'
import { useSpeakerRecordings, type SpeakerRecordingItem } from '../hooks/use-speaker-recordings'
import { translateRejectReasons } from '../lib/qc-translations'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/ui/skeleton'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type StatusFilter = 'all' | 'valid' | 'rejected' | 'processing'

/**
 * Page locuteur : liste de tous les enregistrements faits, avec audio player
 * et raisons de rejet pour ceux qui ont été refusés.
 */
export function SpeakerRecordingsPage() {
  const { recordings, loading, error } = useSpeakerRecordings()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    return recordings.filter((r) => {
      if (filter === 'valid' && r.is_valid !== true) return false
      if (filter === 'rejected' && r.is_valid !== false) return false
      if (filter === 'processing' && r.processing_status !== 'pending' && r.processing_status !== 'processing') return false
      if (search.trim()) {
        const s = search.toLowerCase()
        const matchPhrase = r.phrase?.content.toLowerCase().includes(s) ?? false
        const matchProject = r.project_name?.toLowerCase().includes(s) ?? false
        if (!matchPhrase && !matchProject) return false
      }
      return true
    })
  }, [recordings, filter, search])

  const stats = useMemo(() => ({
    total: recordings.length,
    valid: recordings.filter((r) => r.is_valid === true).length,
    rejected: recordings.filter((r) => r.is_valid === false).length,
    processing: recordings.filter(
      (r) => r.processing_status === 'pending' || r.processing_status === 'processing',
    ).length,
  }), [recordings])

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10 max-w-[960px] mx-auto">
        <Skeleton className="h-7 w-72 mb-3" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 lg:px-8 py-7 max-w-[960px] mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(113,112,255,0.08)',
            border: '1px solid rgba(113,112,255,0.25)',
          }}
        >
          <Headphones className="w-5 h-5" style={{ color: '#7170ff' }} strokeWidth={1.75} />
        </div>
        <div>
          <h1
            className="text-[24px] text-[#f7f8f8] m-0"
            style={{ ...sans, fontWeight: 510, letterSpacing: '-0.3px' }}
          >
            Mes enregistrements
          </h1>
          <p className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
            Réécoutez vos enregistrements et consultez le détail des validations.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex items-stretch gap-3 p-3 rounded-md mb-5 flex-wrap"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <FilterButton
          icon={<Headphones className="w-3.5 h-3.5" strokeWidth={1.75} />}
          label="Tous"
          value={stats.total}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterButton
          icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
          label="Validés"
          value={stats.valid}
          color="#10b981"
          active={filter === 'valid'}
          onClick={() => setFilter('valid')}
        />
        <FilterButton
          icon={<XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />}
          label="Rejetés"
          value={stats.rejected}
          color="#ef4444"
          active={filter === 'rejected'}
          onClick={() => setFilter('rejected')}
        />
        {stats.processing > 0 && (
          <FilterButton
            icon={<Clock className="w-3.5 h-3.5" strokeWidth={1.75} />}
            label="En traitement"
            value={stats.processing}
            color="#fbbf24"
            active={filter === 'processing'}
            onClick={() => setFilter('processing')}
          />
        )}
      </div>

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#62666d]" strokeWidth={1.75} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par phrase ou projet…"
          className="w-full h-[36px] pl-9 pr-3 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
          style={sans}
        />
      </div>

      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] mb-4"
          style={{
            ...sans,
            background: 'var(--t-danger-muted-bg)',
            border: '1px solid var(--t-danger-muted-border)',
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState hasRecordings={recordings.length > 0} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RecordingCard key={r.id} recording={r} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Carte enregistrement ---------- */

function RecordingCard({ recording: r }: { recording: SpeakerRecordingItem }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const loadAudio = async () => {
    if (audioUrl || loadingAudio) return
    setLoadingAudio(true)
    setAudioError(null)
    try {
      // On préfère le processed (WAV nettoyé). Fallback sur raw (WebM original).
      const path = r.processed_storage_path ?? r.raw_storage_path
      const bucket = r.processed_storage_path ? 'audio-processed' : 'audio-raw'
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Audio introuvable')
      setAudioUrl(data.signedUrl)
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoadingAudio(false)
    }
  }

  // Charge l'audio au mount (pour éviter un clic supplémentaire)
  useEffect(() => {
    void loadAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusBadge = getStatusBadge(r)
  const reasons = r.is_valid === false ? translateRejectReasons(r.rejection_reasons) : []

  return (
    <article
      className="flex flex-col gap-2.5 p-3 rounded-md"
      style={{
        background: 'var(--t-surface)',
        border: `1px solid ${
          r.is_valid === true
            ? 'rgba(16,185,129,0.15)'
            : r.is_valid === false
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(255,255,255,0.08)'
        }`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {statusBadge}
            {r.project_name && (
              <span className="text-[10px] text-[#62666d]" style={sans}>
                · {r.project_name}
              </span>
            )}
            {r.phrase && (
              <span className="text-[10px] text-[#62666d] tabular-nums" style={mono}>
                #{r.phrase.position}
              </span>
            )}
          </div>
          <p
            className="text-[13px] text-[#f7f8f8] leading-relaxed m-0"
            style={{ ...sans, fontWeight: 510 }}
          >
            {r.phrase?.content ?? <span className="text-[#62666d] italic">Phrase introuvable</span>}
          </p>
        </div>
      </div>

      {/* Audio player */}
      {audioUrl ? (
        <audio
          controls
          src={audioUrl}
          preload="metadata"
          className="w-full h-[36px]"
          style={{ filter: 'invert(0.9) hue-rotate(180deg)' }}
        />
      ) : audioError ? (
        <div className="flex items-center gap-2 text-[11px] text-[#fca5a5]" style={sans}>
          <AlertCircle className="w-3 h-3" />
          <span>{audioError}</span>
        </div>
      ) : loadingAudio ? (
        <div className="flex items-center gap-2 text-[11px] text-[#62666d]" style={sans}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Chargement de l'audio…
        </div>
      ) : null}

      {/* Raisons rejet */}
      {reasons.length > 0 && (
        <div
          className="flex items-start gap-2 p-2.5 rounded text-[11px] text-[#fca5a5]"
          style={{
            ...sans,
            background: 'rgba(239,68,68,0.04)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="m-0" style={{ fontWeight: 510 }}>Raisons du rejet :</p>
            <p className="mt-0.5 m-0 text-[#d0d6e0]">{reasons.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Métadonnées techniques */}
      {r.processing_status === 'completed' && (
        <div className="flex items-center gap-3 text-[10px] text-[#62666d]" style={mono}>
          {r.duration_seconds != null && (
            <span>{r.duration_seconds.toFixed(1)}s</span>
          )}
          {r.snr_db != null && (
            <span>SNR {r.snr_db.toFixed(1)} dB</span>
          )}
          {r.clipping_pct != null && (
            <span>Clip {(r.clipping_pct * 100).toFixed(1)}%</span>
          )}
        </div>
      )}
    </article>
  )
}

function getStatusBadge(r: SpeakerRecordingItem) {
  if (r.processing_status === 'pending' || r.processing_status === 'processing') {
    return (
      <Badge color="#fbbf24" icon={<Loader2 className="w-2.5 h-2.5 animate-spin" />}>
        En traitement
      </Badge>
    )
  }
  if (r.processing_status === 'failed') {
    return (
      <Badge color="#ef4444" icon={<XCircle className="w-2.5 h-2.5" strokeWidth={2} />}>
        Échec analyse
      </Badge>
    )
  }
  if (r.is_valid === true) {
    return (
      <Badge color="#10b981" icon={<CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2} />}>
        Validé
      </Badge>
    )
  }
  if (r.is_valid === false) {
    return (
      <Badge color="#ef4444" icon={<XCircle className="w-2.5 h-2.5" strokeWidth={2} />}>
        Rejeté
      </Badge>
    )
  }
  return (
    <Badge color="#62666d" icon={null}>
      —
    </Badge>
  )
}

function Badge({
  children, color, icon,
}: { children: React.ReactNode; color: string; icon: React.ReactNode | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded text-[10px] uppercase"
      style={{
        ...sans,
        fontWeight: 590,
        letterSpacing: '0.04em',
        color,
        background: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

function FilterButton({
  icon, label, value, color, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors"
      style={{
        ...sans,
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
      }}
    >
      <span style={{ color: color ?? 'var(--t-fg-3)' }}>{icon}</span>
      <span
        className="text-[15px] tabular-nums"
        style={{ ...sans, fontWeight: 590, color: active ? 'var(--t-fg)' : color ?? 'var(--t-fg-2)' }}
      >
        {value}
      </span>
      <span className="text-[11px] text-[#8a8f98]" style={sans}>
        {label}
      </span>
    </button>
  )
}

function EmptyState({ hasRecordings }: { hasRecordings: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 rounded-md text-center"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center mb-4"
        style={{
          background: 'var(--t-surface-active)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Headphones className="w-5 h-5 text-[#62666d]" strokeWidth={1.5} />
      </div>
      <p className="text-[14px] text-[#d0d6e0] m-0" style={{ ...sans, fontWeight: 510 }}>
        {hasRecordings ? 'Aucun enregistrement ne correspond' : "Vous n'avez pas encore d'enregistrement"}
      </p>
      <p className="text-[12px] text-[#8a8f98] mt-1.5 max-w-[420px]" style={sans}>
        {hasRecordings
          ? 'Essayez de modifier votre recherche ou le filtre.'
          : 'Acceptez une invitation à un projet ou démarrez un projet public depuis l\'onglet Projets pour commencer.'}
      </p>
    </div>
  )
}

void Filter
