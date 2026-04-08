import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Recording } from '../types/database'

interface UseRealtimeRecordingsOptions {
  projectId: string | undefined
  onInsert?: (recording: Recording) => void
  onUpdate?: (recording: Recording) => void
}

export function useRealtimeRecordings({ projectId, onInsert, onUpdate }: UseRealtimeRecordingsOptions) {
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`recordings-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recordings',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onInsert?.(payload.new as Recording)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onUpdate?.(payload.new as Recording)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, onInsert, onUpdate])
}
