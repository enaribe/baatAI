import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './use-auth'
import type { Recording, Phrase } from '../types/database'

export interface SpeakerRecordingItem extends Recording {
  phrase: Pick<Phrase, 'id' | 'content' | 'position'> | null
  project_name: string | null
  project_id: string
}

interface UseSpeakerRecordingsReturn {
  recordings: SpeakerRecordingItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Liste les enregistrements faits par le locuteur courant.
 * Joint la phrase (pour afficher le texte) et le projet (pour le nom).
 */
export function useSpeakerRecordings(): UseSpeakerRecordingsReturn {
  const { user } = useAuth()
  const [recordings, setRecordings] = useState<SpeakerRecordingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Récupère toutes les sessions du speaker
      const { data: sessions, error: sErr } = await supabase
        .from('recording_sessions')
        .select('id')
        .eq('speaker_id', user.id)

      if (sErr) throw sErr

      const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id)

      if (sessionIds.length === 0) {
        setRecordings([])
        return
      }

      // 2. Récupère tous les recordings de ces sessions, avec phrase + projet
      const { data: recs, error: rErr } = await supabase
        .from('recordings')
        .select(`
          *,
          phrases(id, content, position),
          projects(name)
        `)
        .in('session_id', sessionIds)
        .order('uploaded_at', { ascending: false })

      if (rErr) throw rErr

      const items: SpeakerRecordingItem[] = (recs ?? []).map((r: unknown) => {
        const row = r as Recording & {
          phrases?: { id: string; content: string; position: number } | null
          projects?: { name: string } | null
        }
        return {
          ...row,
          phrase: row.phrases ?? null,
          project_name: row.projects?.name ?? null,
        }
      })

      setRecordings(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des enregistrements')
      console.error('useSpeakerRecordings error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { recordings, loading, error, refetch: fetchAll }
}
