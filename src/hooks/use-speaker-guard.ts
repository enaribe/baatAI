import { useAuth } from './use-auth'
import { useSpeakerProfile } from './use-speaker-profile'

export type SpeakerGuardStatus =
  | 'loading'
  | 'no-profile'
  | 'pending'
  | 'rejected'
  | 'approved'

export interface UseSpeakerGuardResult {
  status: SpeakerGuardStatus
  isLoading: boolean
  hasProfile: boolean
  isApproved: boolean
  isPending: boolean
  isRejected: boolean
  canRecord: boolean
}

export function useSpeakerGuard(): UseSpeakerGuardResult {
  const { user, role, roleStatus } = useAuth()
  const { profile, loading: profileLoading } = useSpeakerProfile(user?.id)

  const isAuthLoading = !user || roleStatus === 'idle' || roleStatus === 'loading'
  const isLoading = isAuthLoading || profileLoading

  if (isLoading) {
    return {
      status: 'loading',
      isLoading: true,
      hasProfile: false,
      isApproved: false,
      isPending: false,
      isRejected: false,
      canRecord: false,
    }
  }

  const hasProfile = profile !== null
  const isApproved = profile?.verification_status === 'approved'
  const isPending = profile?.verification_status === 'pending'
  const isRejected = profile?.verification_status === 'rejected'

  let status: SpeakerGuardStatus = 'no-profile'
  if (isApproved) status = 'approved'
  else if (isPending) status = 'pending'
  else if (isRejected) status = 'rejected'

  return {
    status,
    isLoading: false,
    hasProfile,
    isApproved,
    isPending,
    isRejected,
    canRecord: role === 'speaker' && isApproved,
  }
}
