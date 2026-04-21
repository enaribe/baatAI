import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface ValidationItem {
  recording_id: string
  phrase_content: string
  audio_url: string
}

interface UsePeerValidationResult {
  item: ValidationItem | null
  loading: boolean
  submitting: boolean
  error: string | null
  loadNext: (speakerId: string) => Promise<void>
  submit: (vote: boolean, confidence: 'certain' | 'unsure') => Promise<{ error: string | null }>
}

export function usePeerValidation(): UsePeerValidationResult {
  const [item, setItem] = useState<ValidationItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNext = useCallback(async (speakerId: string) => {
    setLoading(true)
    setError(null)

    // Récupérer un recording à valider : completed, pas encore validé par ce speaker,
    // pas son propre recording, moins de 3 votes
    interface RecordingRow {
      id: string
      phrase_id: string
      phrase: { content: string } | null
      processed_storage_path: string | null
      raw_storage_path: string
      session: { speaker_id: string | null } | null
    }

    const { data: recordings, error: err } = await (supabase
      .from('recordings')
      .select(`
        id, phrase_id,
        phrase:phrases(content),
        processed_storage_path,
        raw_storage_path,
        session:recording_sessions!inner(speaker_id)
      `)
      .eq('processing_status', 'completed')
      .neq('recording_sessions.speaker_id', speakerId)
      .not('id', 'in', `(
        SELECT recording_id FROM peer_validations WHERE validator_id = '${speakerId}'
      )`)
      .limit(1)
      .single() as unknown as Promise<{ data: RecordingRow | null; error: unknown }>)

    if (err || !recordings) {
      setItem(null)
      setLoading(false)
      return
    }

    const storagePath = recordings.processed_storage_path ?? recordings.raw_storage_path
    const bucket = recordings.processed_storage_path ? 'audio-processed' : 'audio-raw'
    const { data: urlData } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 300)

    setItem({
      recording_id: recordings.id,
      phrase_content: recordings.phrase?.content ?? '',
      audio_url: urlData?.signedUrl ?? '',
    })
    setLoading(false)
  }, [])

  const submit = useCallback(async (vote: boolean, confidence: 'certain' | 'unsure') => {
    if (!item) return { error: 'Aucun enregistrement chargé' }
    setSubmitting(true)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubmitting(false); return { error: 'Session expirée' } }

    const res = await fetch(`${supabaseUrl}/functions/v1/submit-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ recording_id: item.recording_id, vote, confidence }),
    })
    const json = await res.json() as { data: unknown; error: string | null }
    setSubmitting(false)
    if (!res.ok || json.error) return { error: json.error ?? 'Erreur serveur' }
    return { error: null }
  }, [item])

  return { item, loading, submitting, error, loadNext, submit }
}
