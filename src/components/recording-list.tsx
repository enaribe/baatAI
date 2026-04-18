import { useMemo, useState, useEffect } from 'react'
import { Mic, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Filter } from 'lucide-react'
import { Badge } from './ui/badge'
import { AudioPlayer } from './ui/audio-player'
import { RecordingDetailModal } from './recording-detail-modal'
import { supabase } from '../lib/supabase'
import { translateRejectReasons, translateRecordingStatus } from '../lib/qc-translations'
import type { Recording, Phrase, RecordingSession } from '../types/database'

interface RecordingListProps {
  recordings: Recording[]
  phrases: Phrase[]
  sessions: RecordingSession[]
}

type QcFilter = 'all' | 'valid' | 'rejected' | 'processing' | 'failed'

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle2,
  failed: XCircle,
}

const statusVariants: Record<string, 'pending' | 'processing' | 'valid' | 'rejected'> = {
  pending: 'pending',
  processing: 'processing',
  completed: 'valid',
  failed: 'rejected',
}

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

  const phraseMap = useMemo(
    () => new Map(phrases.map((p) => [p.id, p])),
    [phrases],
  )

  const sessionMap = useMemo(
    () => new Map(sessions.map((s) => [s.id, s])),
    [sessions],
  )

  const counts = useMemo(() => {
    let valid = 0
    let rejected = 0
    let processing = 0
    let failed = 0
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
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5 text-primary-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Enregistrements (0)
          </h3>
        </div>
        <p className="text-sm text-sand-400 dark:text-sand-500 py-4 text-center">
          Aucun enregistrement pour le moment.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Enregistrements ({counts.all})
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-sand-100 dark:bg-sand-800/60 rounded-lg p-0.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-sand-400 ml-2 shrink-0" />
          {(Object.keys(filterLabels) as QcFilter[]).map((key) => {
            const count = counts[key]
            const active = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                  active
                    ? 'bg-white dark:bg-sand-700 text-sand-900 dark:text-sand-100 shadow-sm'
                    : 'text-sand-500 hover:text-sand-700 dark:hover:text-sand-300',
                ].join(' ')}
              >
                {filterLabels[key]}
                <span
                  className={[
                    'tabular-nums text-[10px] px-1.5 rounded-full',
                    active
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
                  ].join(' ')}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-sand-400 dark:text-sand-500 py-8 text-center">
          Aucun enregistrement ne correspond à ce filtre.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 dark:border-sand-800">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide">
                  Phrase
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide hidden md:table-cell">
                  Locuteur
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide hidden sm:table-cell">
                  SNR
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide hidden lg:table-cell">
                  Durée
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide hidden lg:table-cell">
                  Audio
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-sand-500 dark:text-sand-400 uppercase tracking-wide">
                  Détail
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((recording, index) => {
                const phrase = phraseMap.get(recording.phrase_id)
                const session = sessionMap.get(recording.session_id)
                const StatusIcon = statusIcons[recording.processing_status] ?? Clock
                const translatedReasons = translateRejectReasons(recording.rejection_reasons)

                return (
                  <tr
                    key={recording.id}
                    className={`border-b border-sand-100 dark:border-sand-800/50 transition-colors hover:bg-sand-50 dark:hover:bg-sand-800/30 ${
                      index % 2 === 0 ? '' : 'bg-sand-50/50 dark:bg-sand-800/10'
                    }`}
                  >
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <p className="truncate text-sand-800 dark:text-sand-200">
                        {phrase?.content ?? '—'}
                      </p>
                      <p className="text-xs text-sand-400 tabular-nums">#{phrase?.position ?? '?'}</p>
                    </td>

                    <td className="py-2.5 px-3 hidden md:table-cell text-sand-600 dark:text-sand-400">
                      {session?.speaker_name || 'Anonyme'}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={statusVariants[recording.processing_status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {translateRecordingStatus(recording.processing_status)}
                        </Badge>
                        {recording.is_valid === true && (
                          <CheckCircle2 className="w-4 h-4 text-secondary-500" aria-label="Validé" />
                        )}
                        {recording.is_valid === false && (
                          <XCircle className="w-4 h-4 text-red-500" aria-label="Rejeté" />
                        )}
                      </div>
                      {translatedReasons.length > 0 && (
                        <div className="flex items-start gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-amber-600 dark:text-amber-400 leading-snug">
                            {translatedReasons.join(' · ')}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      {recording.snr_db != null ? (
                        <span className="tabular-nums text-sand-700 dark:text-sand-300">
                          {recording.snr_db.toFixed(1)} dB
                        </span>
                      ) : (
                        <span className="text-sand-300 dark:text-sand-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right hidden lg:table-cell">
                      {recording.duration_seconds != null ? (
                        <span className="tabular-nums text-sand-700 dark:text-sand-300">
                          {recording.duration_seconds.toFixed(1)}s
                        </span>
                      ) : (
                        <span className="text-sand-300 dark:text-sand-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 hidden lg:table-cell">
                      {recording.processed_storage_path ? (
                        <SignedAudioPlayer storagePath={recording.processed_storage_path} bucket="audio-processed" />
                      ) : recording.raw_storage_path ? (
                        <SignedAudioPlayer storagePath={recording.raw_storage_path} bucket="audio-raw" />
                      ) : (
                        <span className="text-sand-300 dark:text-sand-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelected(recording)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-sand-600 hover:text-primary-600 dark:text-sand-300 dark:hover:text-primary-400 hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors"
                        aria-label="Voir le détail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Détail</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

interface SignedAudioPlayerProps {
  storagePath: string
  bucket: string
}

function SignedAudioPlayer({ storagePath, bucket }: SignedAudioPlayerProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) {
          setUrl(data.signedUrl)
        }
      })

    return () => { cancelled = true }
  }, [storagePath, bucket])

  if (!url) return <span className="text-sand-300 dark:text-sand-600">—</span>
  return <AudioPlayer src={url} className="justify-end" />
}
