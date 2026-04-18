import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SpeakerProfile } from '../types/database'

interface UseSpeakerProfileResult {
  profile: SpeakerProfile | null
  loading: boolean
  error: string | null
  isApproved: boolean
  refetch: () => Promise<void>
  update: (data: Partial<SpeakerProfile>) => Promise<{ error: string | null }>
}

export function useSpeakerProfile(userId: string | undefined): UseSpeakerProfileResult {
  const [profile, setProfile] = useState<SpeakerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('speaker_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (err && err.code !== 'PGRST116') setError(err.message)
    setProfile(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const update = useCallback(async (data: Partial<SpeakerProfile>) => {
    if (!userId) return { error: 'Non authentifié' }
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('speaker_profiles')
      .update(data as unknown as never)
      .eq('id', userId) as unknown as DbResult)
    if (err) return { error: err.message }
    await fetch()
    return { error: null }
  }, [userId, fetch])

  return {
    profile,
    loading,
    error,
    isApproved: profile?.verification_status === 'approved',
    refetch: fetch,
    update,
  }
}
