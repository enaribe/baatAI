import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface ActiveSpeakerProject {
  session_id: string
  project_id: string
  project_name: string
  language_label: string | null
  target_language: string
  rate_per_hour_fcfa: number
  total_phrases: number
  recorded_phrases: number
  status: string
  updated_at: string
}

interface UseSpeakerActiveProjectsResult {
  projects: ActiveSpeakerProject[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface SessionRow {
  id: string
  project_id: string
  status: string
  total_recorded: number
  created_at: string
  project: {
    name: string
    language_label: string | null
    target_language: string
    rate_per_hour_fcfa: number
  } | null
}

/**
 * Retourne les projets "en cours" du locuteur :
 * les recording_sessions dont le statut n'est pas 'completed' + le comptage
 * de phrases enregistrées vs total du projet, pour afficher une progression.
 */
export function useSpeakerActiveProjects(speakerId: string | undefined): UseSpeakerActiveProjectsResult {
  const [projects, setProjects] = useState<ActiveSpeakerProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActive = useCallback(async () => {
    if (!speakerId) { setLoading(false); setProjects([]); return }
    setLoading(true)
    setError(null)

    // 1. Sessions en cours (ordre du plus récent)
    const { data: sessions, error: err } = await (supabase
      .from('recording_sessions')
      .select('id, project_id, status, total_recorded, created_at, project:projects(name, language_label, target_language, rate_per_hour_fcfa)')
      .eq('speaker_id', speakerId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: SessionRow[] | null
        error: { message: string } | null
      }>)

    if (err) {
      setError(err.message)
      setProjects([])
      setLoading(false)
      return
    }

    const rows = sessions ?? []
    if (rows.length === 0) {
      setProjects([])
      setLoading(false)
      return
    }

    // 2. Compter les phrases totales par projet (une seule requête groupée)
    const projectIds = Array.from(new Set(rows.map((s) => s.project_id)))
    const counts: Record<string, number> = {}
    await Promise.all(projectIds.map(async (pid) => {
      const { count } = await (supabase
        .from('phrases')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', pid) as unknown as Promise<{ count: number | null }>)
      counts[pid] = count ?? 0
    }))

    const mapped: ActiveSpeakerProject[] = rows.map((s) => ({
      session_id: s.id,
      project_id: s.project_id,
      project_name: s.project?.name ?? 'Projet',
      language_label: s.project?.language_label ?? null,
      target_language: s.project?.target_language ?? '',
      rate_per_hour_fcfa: s.project?.rate_per_hour_fcfa ?? 0,
      total_phrases: counts[s.project_id] ?? 0,
      recorded_phrases: s.total_recorded ?? 0,
      status: s.status,
      updated_at: s.created_at,
    }))

    setProjects(mapped)
    setLoading(false)
  }, [speakerId])

  useEffect(() => { fetchActive() }, [fetchActive])

  return { projects, loading, error, refetch: fetchActive }
}
