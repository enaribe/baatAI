import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type FeedbackCategory = 'bug' | 'suggestion' | 'praise' | 'other'
export type FeedbackStatus = 'new' | 'reviewed' | 'archived'

export interface Feedback {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  category: FeedbackCategory
  message: string
  page_url: string | null
  user_agent: string | null
  status: FeedbackStatus
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

interface UseFeedbacksReturn {
  feedbacks: Feedback[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Liste tous les feedbacks (réservé admin via RLS).
 */
export function useFeedbacks(): UseFeedbacksReturn {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setFeedbacks((data ?? []) as unknown as Feedback[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      console.error('useFeedbacks error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { feedbacks, loading, error, refetch: fetchAll }
}
