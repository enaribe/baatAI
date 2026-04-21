import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MatchedSpeaker {
  speaker_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  gender: string | null
  languages: string[]
  dialects: Record<string, string[]>
  reliability_score: number
  is_certified: boolean
  total_validated: number
  match_score: number
  invitation_status: string | null
  has_active_session: boolean
}

export interface MatchFilters {
  search?: string
  gender?: string
  certifiedOnly?: boolean
}

interface UseMatchSpeakersResult {
  speakers: MatchedSpeaker[]
  loading: boolean
  error: string | null
  rawSpeakersCount: number | null
  refetch: () => Promise<void>
}

export function useMatchSpeakers(
  projectId: string | undefined,
  filters: MatchFilters,
): UseMatchSpeakersResult {
  const [speakers, setSpeakers] = useState<MatchedSpeaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawSpeakersCount, setRawSpeakersCount] = useState<number | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    console.group('[useMatchSpeakers] Fetch')
    console.info('projectId:', projectId)
    console.info('filters:', filters)

    // 1. Compte brut de tous les speakers disponibles (sans filtre projet)
    const { count: totalCount, error: countError } = await (supabase
      .from('speaker_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true) as unknown as Promise<{
        count: number | null
        error: { message: string } | null
      }>)

    console.info('Speakers totaux (is_available=true):', totalCount)
    if (countError) console.error('countError:', countError)
    setRawSpeakersCount(totalCount)

    // 2. Appel RPC match
    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: MatchedSpeaker[] | null
        error: { message: string; details?: string; hint?: string; code?: string } | null
      }>
    }).rpc('match_speakers_for_project', {
      p_project_id: projectId,
      p_search: filters.search ?? null,
      p_filter_gender: filters.gender ?? null,
      p_filter_certified: filters.certifiedOnly ?? false,
    })

    if (err) {
      console.error('RPC error:', err)
      const full = [err.message, err.details, err.hint, err.code].filter(Boolean).join(' | ')
      setError(full)
    } else {
      console.info('RPC résultat:', data?.length ?? 0, 'speakers')
      console.table(data ?? [])
    }
    console.groupEnd()

    setSpeakers(data ?? [])
    setLoading(false)
  }, [projectId, filters.search, filters.gender, filters.certifiedOnly])

  useEffect(() => { fetchMatches() }, [fetchMatches])

  return { speakers, loading, error, rawSpeakersCount, refetch: fetchMatches }
}
