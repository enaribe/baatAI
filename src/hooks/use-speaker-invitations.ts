import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProjectInvitation } from '../types/database'

interface InvitationWithProject extends ProjectInvitation {
  project: {
    name: string
    language_label: string | null
    rate_per_hour_fcfa: number
    usage_type: string
  } | null
}

interface UseSpeakerInvitationsResult {
  invitations: InvitationWithProject[]
  loading: boolean
  error: string | null
  respond: (id: string, status: 'accepted' | 'declined') => Promise<{ error: string | null }>
  refetch: () => Promise<void>
}

export function useSpeakerInvitations(speakerId: string | undefined): UseSpeakerInvitationsResult {
  const [invitations, setInvitations] = useState<InvitationWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!speakerId) { setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('project_invitations')
      .select('*, project:projects(name, language_label, rate_per_hour_fcfa, usage_type)')
      .eq('speaker_id', speakerId)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setInvitations((data as InvitationWithProject[]) ?? [])
    setLoading(false)
  }, [speakerId])

  useEffect(() => { fetch() }, [fetch])

  const respond = useCallback(async (id: string, status: 'accepted' | 'declined') => {
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('project_invitations')
      .update({ status, responded_at: new Date().toISOString() } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) return { error: err.message }
    await fetch()
    return { error: null }
  }, [fetch])

  return { invitations, loading, error, respond, refetch: fetch }
}
