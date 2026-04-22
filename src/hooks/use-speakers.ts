import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface SpeakerListItem {
  speaker_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  gender: string | null
  languages: string[]
  dialects: Record<string, string[]>
  reliability_score: number
  is_certified: boolean
  total_recordings: number
  total_validated: number
  is_favorite: boolean
  sample_storage_path: string | null
  sample_duration_seconds: number | null
  created_at: string
}

export interface SpeakersFilters {
  search?: string
  lang?: string
  gender?: string
  certifiedOnly?: boolean
  favoritesOnly?: boolean
}

export function useSpeakers(filters: SpeakersFilters) {
  const [speakers, setSpeakers] = useState<SpeakerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSpeakers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: SpeakerListItem[] | null
        error: { message: string } | null
      }>
    }).rpc('list_speakers', {
      p_search: filters.search ?? null,
      p_lang: filters.lang ?? null,
      p_gender: filters.gender ?? null,
      p_certified_only: filters.certifiedOnly ?? false,
      p_favorites_only: filters.favoritesOnly ?? false,
      p_limit: 120,
      p_offset: 0,
    })

    if (err) {
      setError(err.message)
      setSpeakers([])
    } else {
      setSpeakers(data ?? [])
    }
    setLoading(false)
  }, [filters.search, filters.lang, filters.gender, filters.certifiedOnly, filters.favoritesOnly])

  useEffect(() => { fetchSpeakers() }, [fetchSpeakers])

  const toggleFavorite = useCallback(async (speakerId: string, currentlyFav: boolean) => {
    // Optimistic update
    setSpeakers((prev) =>
      prev.map((s) =>
        s.speaker_id === speakerId ? { ...s, is_favorite: !currentlyFav } : s,
      ),
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (currentlyFav) {
      await (supabase
        .from('client_favorite_speakers')
        .delete()
        .eq('client_id', user.id)
        .eq('speaker_id', speakerId) as unknown as Promise<unknown>)
    } else {
      await (supabase
        .from('client_favorite_speakers')
        .insert({ client_id: user.id, speaker_id: speakerId } as never) as unknown as Promise<unknown>)
    }
  }, [])

  return { speakers, loading, error, refetch: fetchSpeakers, toggleFavorite }
}

export interface SpeakerDetail extends SpeakerListItem {
  country: string
  date_of_birth: string | null
  bio: string | null
  total_duration_seconds: number
  shared_projects_count: number
  sample_recorded_at: string | null
}

export function useSpeakerDetail(speakerId: string | undefined) {
  const [speaker, setSpeaker] = useState<SpeakerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!speakerId) { setLoading(false); setSpeaker(null); return }
    setLoading(true)
    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: SpeakerDetail[] | null
        error: { message: string } | null
      }>
    }).rpc('get_speaker_detail', { p_speaker_id: speakerId })

    if (err) { setError(err.message); setSpeaker(null) }
    else setSpeaker(data?.[0] ?? null)
    setLoading(false)
  }, [speakerId])

  useEffect(() => { fetch() }, [fetch])

  const toggleFavorite = useCallback(async () => {
    if (!speaker) return
    const currentlyFav = speaker.is_favorite
    setSpeaker({ ...speaker, is_favorite: !currentlyFav })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (currentlyFav) {
      await (supabase
        .from('client_favorite_speakers')
        .delete()
        .eq('client_id', user.id)
        .eq('speaker_id', speaker.speaker_id) as unknown as Promise<unknown>)
    } else {
      await (supabase
        .from('client_favorite_speakers')
        .insert({ client_id: user.id, speaker_id: speaker.speaker_id } as never) as unknown as Promise<unknown>)
    }
  }, [speaker])

  return { speaker, loading, error, refetch: fetch, toggleFavorite }
}
