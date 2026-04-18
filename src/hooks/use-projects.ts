import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './use-auth'
import type { Project } from '../types/database'

export interface ProjectWithStats extends Project {
  total_phrases: number
  total_recordings: number
  valid_recordings: number
}

interface UseProjectsReturn {
  projects: ProjectWithStats[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      const rawProjects = (projectsData ?? []) as Project[]

      const projectsWithStats: ProjectWithStats[] = await Promise.all(
        rawProjects.map(async (project) => {
          const [phrasesResult, recordingsResult, validResult] = await Promise.all([
            supabase
              .from('phrases')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id),
            supabase
              .from('recordings')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id),
            supabase
              .from('recordings')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id)
              .eq('is_valid', true),
          ])

          return {
            ...project,
            total_phrases: phrasesResult.count ?? 0,
            total_recordings: recordingsResult.count ?? 0,
            valid_recordings: validResult.count ?? 0,
          }
        }),
      )

      setProjects(projectsWithStats)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des projets'
      setError(message)
      console.error('useProjects error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}
