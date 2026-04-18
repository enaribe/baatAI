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

  const fetch = useCallback(async () => {
    if (!speakerId) { setLoading(false); return }
    setLoading(true)
    const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>
    const { data, error: err } = await rpc('get_available_projects', { p_speaker_id: speakerId })
    if (err) setError(err.message)
    setProjects((data as AvailableProject[]) ?? [])
    setLoading(false)
  }, [speakerId])

  useEffect(() => { fetch() }, [fetch])

  return { projects, loading, error, refetch: fetch }
}
