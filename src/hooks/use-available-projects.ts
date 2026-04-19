import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AvailableProject } from '../types/database'

interface UseAvailableProjectsResult {
  projects: AvailableProject[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAvailableProjects(speakerId: string | undefined): UseAvailableProjectsResult {
  const [projects, setProjects] = useState<AvailableProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!speakerId) {
      setProjects([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, string>) => Promise<{ data: AvailableProject[] | null; error: { message: string } | null }>
    }).rpc('get_available_projects', { p_speaker_id: speakerId })

    if (err) setError(err.message)
    setProjects(data ?? [])
    setLoading(false)
  }, [speakerId])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}
