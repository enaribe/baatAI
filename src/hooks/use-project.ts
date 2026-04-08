import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Project, Phrase, RecordingSession, Recording, Export } from '../types/database'

interface UseProjectReturn {
  project: Project | null
  phrases: Phrase[]
  sessions: RecordingSession[]
  recordings: Recording[]
  exports: Export[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProject(projectId: string | undefined): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null)
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [sessions, setSessions] = useState<RecordingSession[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)

    try {
      const [projectRes, phrasesRes, sessionsRes, recordingsRes, exportsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('phrases').select('*').eq('project_id', projectId).order('position'),
        supabase.from('recording_sessions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('recordings').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
        supabase.from('exports').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ])

      if (projectRes.error) throw projectRes.error

      setProject(projectRes.data as unknown as Project)
      setPhrases((phrasesRes.data ?? []) as unknown as Phrase[])
      setSessions((sessionsRes.data ?? []) as unknown as RecordingSession[])
      setRecordings((recordingsRes.data ?? []) as unknown as Recording[])
      setExports((exportsRes.data ?? []) as unknown as Export[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du projet'
      setError(message)
      console.error('useProject error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { project, phrases, sessions, recordings, exports, loading, error, refetch: fetchAll }
}
