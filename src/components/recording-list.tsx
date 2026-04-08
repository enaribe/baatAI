import { useMemo, useState, useEffect } from 'react'
import { Mic, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from './ui/badge'
import { AudioPlayer } from './ui/audio-player'
import { supabase } from '../lib/supabase'
import type { Recording, Phrase, RecordingSession } from '../types/database'

interface RecordingListProps {
  recordings: Recording[]
  phrases: Phrase[]
  sessions: RecordingSession[]
}

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

export function RecordingList({ recordings, phrases, sessions }: RecordingListProps) {
  const phraseMap = useMemo(
    () => new Map(phrases.map((p) => [p.id, p])),
    [phrases],
  )

  const sessionMap = useMemo(
    () => new Map(sessions.map((s) => [s.id, s])),
    [sessions],
  )

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Enregistrements ({recordings.length})
          </h3>
        </div>
      </div>

      {/* Table */}
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
            </tr>
          </thead>
          <tbody>
            {recordings.map((recording, index) => {
              const phrase = phraseMap.get(recording.phrase_id)
              const session = sessionMap.get(recording.session_id)
              const StatusIcon = statusIcons[recording.processing_status] ?? Clock

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
                        {recording.processing_status}
                      </Badge>
                      {recording.is_valid === true && (
                        <CheckCircle2 className="w-4 h-4 text-secondary-500" />
                      )}
                      {recording.is_valid === false && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {recording.rejection_reasons && recording.rejection_reasons.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {recording.rejection_reasons.join(', ')}
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
