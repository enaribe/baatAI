import { useMemo, useState, useEffect } from 'react'
import {
  Mic, XCircle, Clock, Eye, ChevronDown, CircleCheck,
} from 'lucide-react'
import { AudioPlayer } from './ui/audio-player'
import { RecordingDetailModal } from './recording-detail-modal'
import { supabase } from '../lib/supabase'
import { translateRejectReasons, translateRecordingStatus } from '../lib/qc-translations'
import type { Recording, Phrase, RecordingSession } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface RecordingListProps {
  recordings: Recording[]
  phrases: Phrase[]
  sessions: RecordingSession[]
}

type QcFilter = 'all' | 'valid' | 'rejected' | 'processing' | 'failed'

const filterLabels: Record<QcFilter, string> = {
  all: 'Tous',
  valid: 'Validés',
  rejected: 'Rejetés',
  processing: 'En cours',
  failed: 'Échec',
}

export function RecordingList({ recordings, phrases, sessions }: RecordingListProps) {
  const [filter, setFilter] = useState<QcFilter>('all')
  const [selected, setSelected] = useState<Recording | null>(null)

  const phraseMap = useMemo(() => new Map(phrases.map((p) => [p.id, p])), [phrases])
  const sessionMap = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions])

  const counts = useMemo(() => {
    let valid = 0; let rejected = 0; let processing = 0; let failed = 0
    for (const r of recordings) {
      if (r.processing_status === 'failed') failed++
      else if (r.processing_status === 'pending' || r.processing_status === 'processing') processing++
      else if (r.is_valid === true) valid++
      else if (r.is_valid === false) rejected++
    }
    return { all: recordings.length, valid, rejected, processing, failed }
  }, [recordings])

  const filtered = useMemo(() => {
    if (filter === 'all') return recordings
    return recordings.filter((r) => {
      if (filter === 'failed') return r.processing_status === 'failed'
      if (filter === 'processing') return r.processing_status === 'pending' || r.processing_status === 'processing'
      if (filter === 'valid') return r.processing_status === 'completed' && r.is_valid === true
      if (filter === 'rejected') return r.processing_status === 'completed' && r.is_valid === false
      return true
    })
  }, [recordings, filter])

  if (recordings.length === 0) {
    return (
      <div>
        <SectionHeader total={0} />
        <EmptyState />
      </div>
    )
  }

  return (
    <div>
      {/* Section header + filters */}
      <div className="flex items-center gap-2 h-[36px] mb-2 -mx-5 lg:-mx-8 px-5 lg:px-8 border-b border-[rgba(255,255,255,0.05)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Enregistrements
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {counts.all}
        </span>

        <div className="ml-auto flex items-center gap-1 overflow-x-auto">
          {(Object.keys(filterLabels) as QcFilter[]).map((key) => {
            const on = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="inline-flex items-center gap-1.5 h-[24px] px-2 text-[11px] rounded-md transition-colors whitespace-nowrap"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: on ? 'var(--t-fg)' : 'var(--t-fg-3)',
                  background: on ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: `1px solid ${on ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                }}
              >
                {filterLabels[key]}
                <span className="text-[10px] text-[#62666d] tabular-nums" style={mono}>
                  {counts[key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Aucun enregistrement ne correspond à ce filtre." />
      ) : (
        <div
          className="rounded-[8px] overflow-hidden"
          style={{
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-[minmax(180px,2fr)_120px_120px_80px_70px_130px_70px] gap-3 px-4 py-2.5 text-[10px] text-[#62666d] uppercase"
            style={{
              ...sans,
              fontWeight: 510,
              letterSpacing: '0.04em',
              background: 'var(--t-bg-subtle)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span>Phrase</span>
            <span className="hidden md:block">Locuteur</span>
            <span>Statut</span>
            <span className="hidden sm:block text-right">SNR</span>
            <span className="hidden lg:block text-right">Durée</span>
            <span className="hidden lg:block text-right">Audio</span>
            <span className="text-right">Détail</span>
          </div>

          {filtered.map((recording, idx) => {
            const phrase = phraseMap.get(recording.phrase_id)
            const session = sessionMap.get(recording.session_id)
            const reasons = translateRejectReasons(recording.rejection_reasons)

            const last = idx === filtered.length - 1

            return (
              <div
                key={recording.id}
                className="grid grid-cols-[minmax(180px,2fr)_120px_120px_80px_70px_130px_70px] gap-3 px-4 py-3 items-center hover:bg-[rgba(255,255,255,0.025)] transition-colors"
                style={{
                  borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Phrase */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-[#62666d] tabular-nums shrink-0" style={mono}>
                    #{phrase?.position ?? '?'}
                  </span>
                  <span
                    className="text-[13px] text-[#f7f8f8] truncate"
                    style={sans}
                  >
                    {phrase?.content ?? '—'}
                  </span>
                </div>

                {/* Speaker */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0"
                    style={{
                      background: 'var(--t-fg-5)',
                      color: 'var(--t-fg)',
                      ...sans,
                      fontWeight: 590,
                    }}
                  >
                    {(session?.speaker_name?.[0] ?? 'A').toUpperCase()}
                  </div>
                  <span
                    className="text-[12px] text-[#d0d6e0] truncate"
                    style={sans}
                  >
                    {session?.speaker_name || 'Anonyme'}
                  </span>
                </div>

                {/* Statut */}
                <StatusCell recording={recording} reasons={reasons} />

                {/* SNR */}
                <span
                  className="hidden sm:block text-right text-[12px] tabular-nums"
                  style={{ ...mono, color: recording.snr_db != null ? 'var(--t-fg-2)' : 'var(--t-fg-5)' }}
                >
                  {recording.snr_db != null ? `${recording.snr_db.toFixed(1)} dB` : '—'}
                </span>

                {/* Durée */}
                <span
                  className="hidden lg:block text-right text-[12px] tabular-nums"
                  style={{ ...mono, color: recording.duration_seconds != null ? 'var(--t-fg-2)' : 'var(--t-fg-5)' }}
                >
                  {recording.duration_seconds != null ? `${recording.duration_seconds.toFixed(1)}s` : '—'}
                </span>

                {/* Audio */}
                <div className="hidden lg:block">
                  {recording.processed_storage_path ? (
                    <SignedAudioPlayer storagePath={recording.processed_storage_path} bucket="audio-processed" />
                  ) : recording.raw_storage_path ? (
                    <SignedAudioPlayer storagePath={recording.raw_storage_path} bucket="audio-raw" />
                  ) : (
                    <span className="text-[12px] text-[#3e3e44]">—</span>
                  )}
                </div>

                {/* Détail */}
                <div className="text-right">
                  <button
                    onClick={() => setSelected(recording)}
                    className="inline-flex items-center gap-1 h-[24px] px-2 text-[11px] rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    style={{ ...sans, fontWeight: 510 }}
                    aria-label="Voir le détail"
                  >
                    <Eye className="w-3 h-3" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Détail</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <RecordingDetailModal
          recording={selected}
          phrase={phraseMap.get(selected.phrase_id) ?? null}
          session={sessionMap.get(selected.session_id) ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

/* ---------- StatusCell ---------- */

function StatusCell({ recording, reasons }: { recording: Recording; reasons: string[] }) {
  const statusMap: Record<string, { Icon: typeof Clock; color: string }> = {
    pending: { Icon: Clock, color: '#8a8f98' },
    processing: { Icon: Clock, color: '#8a8f98' },
    completed: { Icon: CircleCheck, color: 'var(--t-success)' },
    failed: { Icon: XCircle, color: 'var(--t-danger-text)' },
  }
  const cfg = statusMap[recording.processing_status] ?? statusMap.pending!
  const { Icon } = cfg

  let effectiveColor = cfg.color
  if (recording.processing_status === 'completed' && recording.is_valid === false) {
    effectiveColor = 'var(--t-warning)'
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span
        className="inline-flex items-center gap-1 text-[11px]"
        style={{
          ...sans,
          fontWeight: 510,
          color: effectiveColor,
        }}
      >
        <Icon className="w-3 h-3" strokeWidth={2} />
        {recording.is_valid === false ? 'Rejeté' : translateRecordingStatus(recording.processing_status)}
      </span>
      {reasons.length > 0 && (
        <span
          className="text-[10px] text-[#fbbf24] truncate"
          style={sans}
          title={reasons.join(' · ')}
        >
          {reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1}` : ''}
        </span>
      )}
    </div>
  )
}

/* ---------- SignedAudioPlayer ---------- */

function SignedAudioPlayer({ storagePath, bucket }: { storagePath: string; bucket: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) setUrl(data.signedUrl)
      })
    return () => { cancelled = true }
  }, [storagePath, bucket])

  if (!url) return <span className="text-[12px] text-[#3e3e44]">—</span>
  return <AudioPlayer src={url} className="justify-end" />
}

/* ---------- Helpers ---------- */

function SectionHeader({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-2 h-[36px] mb-2 -mx-5 lg:-mx-8 px-5 lg:px-8 border-b border-[rgba(255,255,255,0.05)]">
      <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
      <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
        Enregistrements
      </span>
      <span className="text-[11px] text-[#62666d]" style={mono}>
        {total}
      </span>
    </div>
  )
}

function EmptyState({ text = 'Aucun enregistrement pour le moment.' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Mic className="w-4 h-4 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-[#8a8f98]" style={sans}>
        {text}
      </p>
    </div>
  )
}
