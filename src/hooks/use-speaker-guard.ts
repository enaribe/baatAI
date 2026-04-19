import { useAuth } from './use-auth'
import { useSpeakerProfile } from './use-speaker-profile'

export type SpeakerGuardStatus = 'loading' | 'no-profile' | 'ready'

export interface UseSpeakerGuardResult {
  status: SpeakerGuardStatus
  isLoading: boolean
  hasProfile: boolean
  canRecord: boolean
}

export function useSpeakerGuard(): UseSpeakerGuardResult {
  const { user, role, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useSpeakerProfile(user?.id)

  const isLoading = authLoading || !user || profileLoading

  if (isLoading) {
    return {
      status: 'loading',
      isLoading: true,
      hasProfile: false,
      canRecord: false,
    }
  }

  const hasProfile = profile !== null

  return {
    status: hasProfile ? 'ready' : 'no-profile',
    isLoading: false,
    hasProfile,
    canRecord: role === 'speaker' && hasProfile,
  }
}
