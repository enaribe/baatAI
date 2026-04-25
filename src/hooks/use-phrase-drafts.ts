import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { PhraseDraft, Subtopic } from '../types/database'

interface UsePhraseDraftsReturn {
  subtopic: Subtopic | null
  drafts: PhraseDraft[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Charge un sous-thème + ses phrase_drafts.
 */
export function usePhraseDrafts(subtopicId: string | undefined): UsePhraseDraftsReturn {
  const [subtopic, setSubtopic] = useState<Subtopic | null>(null)
  const [drafts, setDrafts] = useState<PhraseDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!subtopicId) return
    setLoading(true)
    setError(null)
    try {
      const [subRes, draftsRes] = await Promise.all([
        supabase.from('subtopics').select('*').eq('id', subtopicId).single(),
        supabase.from('phrase_drafts').select('*').eq('subtopic_id', subtopicId).order('position'),
      ])
      if (subRes.error) throw subRes.error
      setSubtopic(subRes.data as unknown as Subtopic)
      setDrafts((draftsRes.data ?? []) as unknown as PhraseDraft[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      console.error('usePhraseDrafts error:', err)
    } finally {
      setLoading(false)
    }
  }, [subtopicId])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { subtopic, drafts, loading, error, refetch: fetchAll }
}
