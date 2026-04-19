import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProjectInvitation } from '../types/database'

export interface InvitationDetail extends ProjectInvitation {
  project: {
    id: string
    name: string
    description: string | null
    language_label: string | null
    target_language: string
    usage_type: string
    rate_per_hour_fcfa: number
    funding_source: string | null
    required_languages: string[]
    required_dialects: string[]
    required_gender: string | null
  } | null
  phrase_count: number
  preview_phrases: { id: string; content: string }[]
  inviter_name: string | null
}

interface UseInvitationDetailResult {
  invitation: InvitationDetail | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInvitationDetail(invitationId: string | undefined): UseInvitationDetailResult {
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!invitationId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data: inv, error: invErr } = await supabase
      .from('project_invitations')
      .select(`
        *,
        project:projects(
          id, name, description, language_label, target_language, usage_type,
          rate_per_hour_fcfa, funding_source, required_languages, required_dialects, required_gender
        )
      `)
      .eq('id', invitationId)
      .single() as unknown as {
        data: (ProjectInvitation & { project: InvitationDetail['project'] }) | null
        error: { message: string } | null
      }

    if (invErr || !inv) {
      setError(invErr?.message ?? 'Invitation introuvable')
      setLoading(false)
      return
    }

    const projectId = inv.project?.id
    if (!projectId) {
      setInvitation({ ...inv, phrase_count: 0, preview_phrases: [], inviter_name: null })
      setLoading(false)
      return
    }

    const [countRes, phrasesRes] = await Promise.all([
      supabase
        .from('phrases')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId),
      supabase
        .from('phrases')
        .select('id, content')
        .eq('project_id', projectId)
        .order('position', { ascending: true })
        .limit(3),
    ])

    let inviterName: string | null = null
    if (inv.invited_by) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', inv.invited_by)
        .single() as unknown as { data: { full_name: string | null } | null }
      inviterName = inviter?.full_name ?? null
    }

    setInvitation({
      ...inv,
      phrase_count: countRes.count ?? 0,
      preview_phrases: (phrasesRes.data as unknown as { id: string; content: string }[]) ?? [],
      inviter_name: inviterName,
    })
    setLoading(false)
  }, [invitationId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  return { invitation, loading, error, refetch: fetchDetail }
}
