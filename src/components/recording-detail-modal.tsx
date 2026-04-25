import { useEffect, useState } from 'react'
import { X, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { Badge } from './ui/badge'
import { AudioPlayer } from './ui/audio-player'
import { supabase } from '../lib/supabase'
import { getRejectionInfo, translateRecordingStatus } from '../lib/qc-translations'
import type { Recording, Phrase, RecordingSession } from '../types/database'

interface RecordingDetailModalProps {
  recording: Recording
  phrase: Phrase | null
  session: RecordingSession | null
  onClose: () => void
}

export function RecordingDetailModal({ recording, phrase, session, onClose }: RecordingDetailModalProps) {
  const [rawUrl, setRawUrl] = useState<string | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadUrl = async (bucket: string, path: string | null, setter: (u: string) => void) => {
      if (!path) return
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (!cancelled && !error && data?.signedUrl) setter(data.signedUrl)
    }
    loadUrl('audio-raw', recording.raw_storage_path, setRawUrl)
    loadUrl('audio-processed', recording.processed_storage_path, setProcessedUrl)
    return () => { cancelled = true }
  }, [recording.raw_storage_path, recording.processed_storage_path])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const statusVariant = recording.processing_status === 'failed'
    ? 'rejected'
    : recording.processing_status === 'completed'
      ? (recording.is_valid ? 'valid' : 'rejected')
      : recording.processing_status === 'processing' || recording.processing_status === 'pending'
        ? 'processing'
        : 'default'

  const uploadedAt = new Date(recording.uploaded_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const processedAt = recording.processed_at
    ? new Date(recording.processed_at).toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[42rem] max-h-[92dvh] overflow-y-auto animate-scale-in"
        style={{
          WebkitOverflowScrolling: 'touch',
          background: 'var(--t-modal-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div
          className="sticky top-0 px-6 py-4 flex items-start justify-between gap-4 z-10"
          style={{
            background: 'var(--t-modal-bg)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusVariant}>{translateRecordingStatus(recording.processing_status)}</Badge>
              {recording.is_valid === true && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 dark:text-secondary-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validé
                </span>
              )}
              {recording.is_valid === false && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> Rejeté
                </span>
              )}
              {recording.qc_profile_used && (
                <Badge variant={recording.qc_profile_used === 'asr' ? 'asr' : 'tts'}>
                  Profil {recording.qc_profile_used.toUpperCase()}
                </Badge>
              )}
            </div>
            <h2
              className="text-lg font-bold text-sand-900 dark:text-sand-100 leading-tight break-words"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {phrase?.content ?? 'Phrase introuvable'}
            </h2>
            <p className="text-xs text-sand-500 mt-1 tabular-nums">
              Phrase #{phrase?.position ?? '?'} · Locuteur : {session?.speaker_name || 'Anonyme'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors text-sand-500"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {recording.processing_status === 'failed' && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Traitement échoué</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Le serveur n'a pas pu analyser cet audio. {recording.rejection_reasons?.[0] ? `Détail : ${recording.rejection_reasons[0]}` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {recording.processing_status === 'completed' && recording.is_valid === false && recording.rejection_reasons && recording.rejection_reasons.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-sand-500 dark:text-sand-400 uppercase tracking-wide mb-2">
                Raisons du rejet
              </h3>
              <div className="space-y-2">
                {recording.rejection_reasons.map((code) => {
                  const info = getRejectionInfo(code)
                  return (
                    <div
                      key={code}
                      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {info?.label ?? code}
                          </p>
                          {info && (
                            <>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                {info.description}
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 italic">
                                → {info.advice}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-sand-500 dark:text-sand-400 uppercase tracking-wide mb-2">
              Métriques qualité
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Durée" value={recording.duration_seconds} unit="s" decimals={2} />
              <MetricCard label="SNR" value={recording.snr_db} unit="dB" decimals={1} />
              <MetricCard
                label="Clipping"
                value={recording.clipping_pct != null ? recording.clipping_pct * 100 : null}
                unit="%"
                decimals={2}
              />
              <MetricCard
                label="Silence VAD"
                value={recording.silence_ratio != null ? recording.silence_ratio * 100 : null}
                unit="%"
                decimals={1}
              />
            </div>

            {(recording.mos_overall != null || recording.mos_signal != null || recording.mos_noise != null) && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-sand-400 dark:text-sand-500 uppercase tracking-wider mb-2">
                  DNSMOS P.835 — Qualité perceptuelle
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Global" value={recording.mos_overall} unit="/5" decimals={2} />
                  <MetricCard label="Signal" value={recording.mos_signal} unit="/5" decimals={2} />
                  <MetricCard label="Bruit" value={recording.mos_noise} unit="/5" decimals={2} />
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-sand-500 dark:text-sand-400 uppercase tracking-wide mb-2">
              Audio
            </h3>
            <div className="space-y-3">
              <AudioBlock label="Brut (WebM)" url={rawUrl} />
              <AudioBlock label="Traité (WAV)" url={processedUrl} emptyHint="Pas encore disponible" />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-sand-500 dark:text-sand-400 uppercase tracking-wide mb-2">
              Informations
            </h3>
            <dl className="text-xs space-y-1.5 text-sand-600 dark:text-sand-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sand-400" />
                <dt className="font-semibold">Soumis :</dt>
                <dd className="tabular-nums">{uploadedAt}</dd>
              </div>
              {processedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sand-400" />
                  <dt className="font-semibold">Traité :</dt>
                  <dd className="tabular-nums">{processedAt}</dd>
                </div>
              )}
              {recording.file_size_bytes != null && (
                <div className="flex items-center gap-2">
                  <dt className="font-semibold pl-5">Taille :</dt>
                  <dd className="tabular-nums">{(recording.file_size_bytes / 1024).toFixed(1)} Ko</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number | null
  unit: string
  decimals: number
}

function MetricCard({ label, value, unit, decimals }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-sand-50 dark:bg-sand-800/40 border border-sand-200/60 dark:border-sand-800 p-3">
      <p className="text-[10px] font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-base font-bold text-sand-800 dark:text-sand-100 tabular-nums mt-0.5">
        {value != null ? value.toFixed(decimals) : '—'}
        {value != null && <span className="text-xs text-sand-500 font-semibold ml-1">{unit}</span>}
      </p>
    </div>
  )
}

interface AudioBlockProps {
  label: string
  url: string | null
  emptyHint?: string
}

function AudioBlock({ label, url, emptyHint }: AudioBlockProps) {
  return (
    <div className="rounded-xl bg-sand-50 dark:bg-sand-800/40 border border-sand-200/60 dark:border-sand-800 px-3 py-2.5 flex items-center gap-3">
      <span className="text-xs font-semibold text-sand-600 dark:text-sand-400 shrink-0 w-24">
        {label}
      </span>
      {url ? (
        <AudioPlayer src={url} className="flex-1" />
      ) : (
        <span className="text-xs text-sand-400 dark:text-sand-500 italic">{emptyHint ?? '—'}</span>
      )}
    </div>
  )
}
