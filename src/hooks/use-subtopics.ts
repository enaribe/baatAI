import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Subtopic } from '../types/database'

interface UseSubtopicsReturn {
  subtopics: Subtopic[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Charge les sous-thèmes d'un projet et écoute les changements Realtime.
 * Utile pour la page projet : statuts qui passent de generating → ready
 * sans avoir à rafraîchir.
 */
export function useSubtopics(projectId: string | undefined): UseSubtopicsReturn {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubtopics = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('subtopics')
        .select('*')
        .eq('project_id', projectId)
        .order('position')
      if (fetchError) throw fetchError
      setSubtopics((data ?? []) as unknown as Subtopic[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des sous-thèmes')
      console.error('useSubtopics error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSubtopics()
  }, [fetchSubtopics])

  // Realtime : un subtopic qui change de statut (generating → ready)
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`subtopics:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subtopics', filter: `project_id=eq.${projectId}` },
        () => { fetchSubtopics() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [projectId, fetchSubtopics])

  return { subtopics, loading, error, refetch: fetchSubtopics }
}
