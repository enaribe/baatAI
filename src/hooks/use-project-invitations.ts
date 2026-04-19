import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ProjectInvitation } from '../types/database'

export interface ProjectInvitationWithSpeaker extends ProjectInvitation {
  speaker: {
    id: string
    full_name: string | null
    avatar_url: string | null
    city: string | null
    languages: string[]
    is_certified: boolean
    reliability_score: number
  } | null
}

interface UseProjectInvitationsResult {
  invitations: ProjectInvitationWithSpeaker[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjectInvitations(projectId: string | undefined): UseProjectInvitationsResult {
  const [invitations, setInvitations] = useState<ProjectInvitationWithSpeaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAll = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('project_invitations')
      .select(`
        *,
        speaker:speaker_profiles!inner(
          id, avatar_url, city, languages, is_certified, reliability_score,
          profile:profiles!inner(full_name)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }) as unknown as {
        data: (ProjectInvitation & {
          speaker: {
            id: string
            avatar_url: string | null
            city: string | null
            languages: string[]
            is_certified: boolean
            reliability_score: number
            profile: { full_name: string | null }
          } | null
        })[] | null
        error: { message: string } | null
      }

    if (err) setError(err.message)

    const flattened = (data ?? []).map(row => ({
      ...row,
      speaker: row.speaker
        ? {
            id: row.speaker.id,
            full_name: row.speaker.profile?.full_name ?? null,
            avatar_url: row.speaker.avatar_url,
            city: row.speaker.city,
            languages: row.speaker.languages,
            is_certified: row.speaker.is_certified,
            reliability_score: row.speaker.reliability_score,
          }
        : null,
    })) as ProjectInvitationWithSpeaker[]

    setInvitations(flattened)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime sur les changements d'invitations de ce projet
  useEffect(() => {
    if (!projectId) return
    const channel = supabase
      .channel(`project_invitations:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_invitations',
          filter: `project_id=eq.${projectId}`,
        },
        () => { fetchAll() },
      )
      .subscribe()
    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [projectId, fetchAll])

  return { invitations, loading, error, refetch: fetchAll }
}
