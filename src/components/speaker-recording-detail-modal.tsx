import { useState, useEffect } from 'react'
import {
  X, Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { translateRejectReasons } from '../lib/qc-translations'
import type { Phrase } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface SpeakerRecordingDetailModalProps {
  open: boolean
  phrase: Phrase | null
  /** ID du recording. Si null, on l'a pas encore chargé : on affiche un loading. */
  recordingId: string | null
  onClose: () => void
}

/**
 * Modal qui affiche le détail d'un enregistrement fait par le locuteur :
 *   - texte de la phrase
 *   - audio player (signed URL chargée à l'ouverture)
 *   - statut QC (validé / rejeté / en traitement)
 *   - raisons de rejet le cas échéant
 *   - métadonnées techniques (durée, SNR, clipping)
 *
 * On charge le recording à l'ouverture (pas en amont) pour éviter N requêtes
 * inutiles dans la liste des phrases.
 */
export function SpeakerRecordingDetailModal({
  open, phrase, recordingId, onClose,
}: SpeakerRecordingDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState<{
    id: string
    raw_storage_path: string
    processed_storage_path: string | null
    processing_status: string
    is_valid: boolean | null
    rejection_reasons: string[] | null
    duration_seconds: number | null
    snr_db: number | null
    clipping_pct: number | null
  } | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Charge le recording + signed URL quand la modal s'ouvre
  useEffect(() => {
    if (!open || !recordingId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setRecording(null)
    setAudioUrl(null)

    const load = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('recordings')
          .select('id, raw_storage_path, processed_storage_path, processing_status, is_valid, rejection_reasons, duration_seconds, snr_db, clipping_pct')
          .eq('id', recordingId)
          .single()

        if (fetchErr || !data) throw new Error(fetchErr?.message ?? 'Enregistrement introuvable')
        if (cancelled) return

        const rec = data as typeof recording
        setRecording(rec)

        if (rec) {
          const path = rec.processed_storage_path ?? rec.raw_storage_path
          const bucket = rec.processed_storage_path ? 'audio-processed' : 'audio-raw'
          const { data: urlData, error: urlErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600)
          if (cancelled) return
          if (urlErr || !urlData?.signedUrl) {
            setError("Impossible de charger l'audio")
          } else {
            setAudioUrl(urlData.signedUrl)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [open, recordingId])

  if (!open) return null

  const reasons = recording?.is_valid === false
    ? translateRejectReasons(recording.rejection_reasons)
    : []

  const statusBadge = recording ? getStatusBadge(recording) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full max-w-[480px] max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--t-modal-bg)',
          border: '1px solid var(--t-border)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-start gap-3 px-5 py-4 z-10"
          style={{
            background: 'var(--t-modal-bg)',
            borderBottom: '1px solid var(--t-surface-active)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] uppercase text-[var(--t-fg-4)] m-0"
              style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
            >
              Phrase #{phrase?.position ?? '?'}
            </p>
            <h2
              className="text-[15px] text-[var(--t-fg)] mt-1 m-0 leading-snug"
              style={{ ...sans, fontWeight: 590 }}
            >
              {phrase?.content ?? '—'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--t-fg-3)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--t-fg-3)]" style={sans}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Chargement de l'enregistrement…
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5]"
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

          {recording && (
            <>
              {statusBadge && <div>{statusBadge}</div>}

              {/* Audio player */}
              {audioUrl ? (
                <audio
                  controls
                  src={audioUrl}
                  preload="metadata"
                  className="w-full h-[40px]"
                  style={{ filter: 'invert(0.9) hue-rotate(180deg)' }}
                />
              ) : !loading && !error ? (
                <div className="flex items-center gap-2 text-[11px] text-[var(--t-fg-4)]" style={sans}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Préparation de l'audio…
                </div>
              ) : null}

              {/* Raisons rejet */}
              {reasons.length > 0 && (
                <div
                  className="flex items-start gap-2 p-3 rounded-md text-[12px] text-[#fca5a5]"
                  style={{
                    ...sans,
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.18)',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="m-0" style={{ fontWeight: 510 }}>Raisons du rejet</p>
                    <p className="mt-1 m-0 text-[var(--t-fg-2)] leading-relaxed">
                      {reasons.join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Métriques techniques */}
              {recording.processing_status === 'completed' && (
                <div className="flex items-center gap-4 text-[11px] text-[var(--t-fg-4)] flex-wrap" style={mono}>
                  {recording.duration_seconds != null && (
                    <Metric label="Durée" value={`${recording.duration_seconds.toFixed(1)}s`} />
                  )}
                  {recording.snr_db != null && (
                    <Metric label="SNR" value={`${recording.snr_db.toFixed(1)} dB`} />
                  )}
                  {recording.clipping_pct != null && (
                    <Metric label="Clip" value={`${(recording.clipping_pct * 100).toFixed(1)}%`} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getStatusBadge(rec: {
  processing_status: string
  is_valid: boolean | null
}): React.ReactNode {
  if (rec.processing_status === 'pending' || rec.processing_status === 'processing') {
    return <Badge color="#fbbf24" icon={<Loader2 className="w-3 h-3 animate-spin" />}>Analyse en cours</Badge>
  }
  if (rec.processing_status === 'failed') {
    return <Badge color="#ef4444" icon={<XCircle className="w-3 h-3" strokeWidth={2} />}>Échec analyse</Badge>
  }
  if (rec.is_valid === true) {
    return <Badge color="#10b981" icon={<CheckCircle2 className="w-3 h-3" strokeWidth={2} />}>Enregistrement validé</Badge>
  }
  if (rec.is_valid === false) {
    return <Badge color="#ef4444" icon={<XCircle className="w-3 h-3" strokeWidth={2} />}>Enregistrement rejeté</Badge>
  }
  return <Badge color="var(--t-fg-4)" icon={<Clock className="w-3 h-3" strokeWidth={2} />}>—</Badge>
}

function Badge({
  children, color, icon,
}: { children: React.ReactNode; color: string; icon: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px]"
      style={{
        ...sans,
        fontWeight: 510,
        color,
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[var(--t-fg-4)] text-[10px] uppercase">{label}</span>
      <span className="text-[var(--t-fg-2)] tabular-nums">{value}</span>
    </span>
  )
}
