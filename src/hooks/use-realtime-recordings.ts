import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Recording } from '../types/database'

interface UseRealtimeRecordingsOptions {
  projectId: string | undefined
  onInsert?: (recording: Recording) => void
  onUpdate?: (recording: Recording) => void
}

export function useRealtimeRecordings({ projectId, onInsert, onUpdate }: UseRealtimeRecordingsOptions) {
  // On stocke les callbacks dans un ref pour qu'ils ne déclenchent pas
  // de re-subscribe à chaque render. Le subscribe ne dépend que de projectId.
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onInsertRef.current = onInsert }, [onInsert])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

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
          onInsertRef.current?.(payload.new as Recording)
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
          onUpdateRef.current?.(payload.new as Recording)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])
}
