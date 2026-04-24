import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type EmailStatus = 'pending' | 'sent' | 'failed'
export type EmailTemplate =
  | 'request_received'
  | 'request_approved'
  | 'request_rejected'
  | 'request_waitlist'
  | 'account_suspended'
  | 'account_revoked'

export interface EmailLog {
  id: string
  recipient_email: string
  recipient_user_id: string | null
  template: EmailTemplate
  subject: string
  related_entity_type: string | null
  related_entity_id: string | null
  payload: Record<string, string> | null
  status: EmailStatus
  resend_message_id: string | null
  error_message: string | null
  attempts: number
  sent_at: string | null
  created_at: string
}

export function useEmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await (supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200) as unknown as Promise<{
        data: EmailLog[] | null
        error: { message: string } | null
      }>)
    if (err) setError(err.message)
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}
