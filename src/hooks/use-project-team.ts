import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface TeamMember {
  speaker_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  is_certified: boolean
  reliability_score: number
  session_id: string
  session_status: string
  total_recorded: number
  total_validated: number
  joined_at: string
}

interface UseProjectTeamResult {
  members: TeamMember[]
  totalPhrases: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjectTeam(projectId: string | undefined): UseProjectTeamResult {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [totalPhrases, setTotalPhrases] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeam = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    // Total phrases pour calcul de progression
    const { count: phraseCount } = await supabase
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
    setTotalPhrases(phraseCount ?? 0)

    // Sessions actives ou complétées avec speaker_id
    const { data: sessions, error: sessErr } = await supabase
      .from('recording_sessions')
      .select(`
        id, status, total_recorded, created_at, speaker_id,
        speaker:speaker_profiles!inner(
          avatar_url, city, is_certified, reliability_score,
          profile:profiles!inner(full_name)
        )
      `)
      .eq('project_id', projectId)
      .not('speaker_id', 'is', null)
      .order('created_at', { ascending: false }) as unknown as {
        data: {
          id: string
          status: string
          total_recorded: number
          created_at: string
          speaker_id: string
          speaker: {
            avatar_url: string | null
            city: string | null
            is_certified: boolean
            reliability_score: number
            profile: { full_name: string | null }
          } | null
        }[] | null
        error: { message: string } | null
      }

    if (sessErr) {
      setError(sessErr.message)
      setLoading(false)
      return
    }

    const sessionIds = (sessions ?? []).map(s => s.id)
    const validatedCounts = new Map<string, number>()

    if (sessionIds.length > 0) {
      // Count validated recordings per session
      const { data: recs } = await supabase
        .from('recordings')
        .select('session_id, is_valid')
        .in('session_id', sessionIds)
        .eq('is_valid', true) as unknown as {
          data: { session_id: string }[] | null
        }
      for (const r of recs ?? []) {
        validatedCounts.set(r.session_id, (validatedCounts.get(r.session_id) ?? 0) + 1)
      }
    }

    const team: TeamMember[] = (sessions ?? []).map(s => ({
      speaker_id: s.speaker_id,
      full_name: s.speaker?.profile?.full_name ?? null,
      avatar_url: s.speaker?.avatar_url ?? null,
      city: s.speaker?.city ?? null,
      is_certified: s.speaker?.is_certified ?? false,
      reliability_score: s.speaker?.reliability_score ?? 0,
      session_id: s.id,
      session_status: s.status,
      total_recorded: s.total_recorded,
      total_validated: validatedCounts.get(s.id) ?? 0,
      joined_at: s.created_at,
    }))

    setMembers(team)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  return { members, totalPhrases, loading, error, refetch: fetchTeam }
}
