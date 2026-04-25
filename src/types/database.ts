export type ProjectUsageType = 'asr' | 'tts' | 'both'
export type ProjectStatus = 'draft' | 'active' | 'processing' | 'completed' | 'archived'
export type SessionStatus = 'pending' | 'active' | 'completed'
export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ExportFormat = 'ljspeech' | 'huggingface' | 'csv_wav'
export type ExportStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type UserRole = 'client' | 'admin' | 'speaker'

// ── Locuteurs ──────────────────────────────────────────────────────────────
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

export type NotificationType =
  | 'invitation_received'
  | 'invitation_reminder'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'recording_rejected'
  | 'project_completed'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}
export type WalletTransactionType =
  | 'recording_validated'
  | 'validation_reward'
  | 'bonus'
  | 'withdrawal_request'
  | 'withdrawal_paid'
  | 'withdrawal_refund'
export type WalletTransactionStatus = 'pending' | 'confirmed' | 'failed'
export type WithdrawalMethod = 'wave' | 'orange_money' | 'free_money' | 'bank'
export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'failed'
export type RequiredGender = 'male' | 'female' | 'any'

export interface Profile {
  id: string
  full_name: string | null
  organization: string | null
  role: UserRole
  created_at: string
}

export interface SpeakerProfile {
  id: string
  phone: string | null
  avatar_url: string | null
  bio: string | null
  date_of_birth: string | null
  gender: Gender | null
  city: string | null
  country: string
  languages: string[]
  dialects: Record<string, string[]>
  reliability_score: number
  total_recordings: number
  total_validated: number
  total_duration_seconds: number
  is_certified: boolean
  certified_at: string | null
  certified_by: string | null
  wallet_balance_fcfa: number
  total_earned_fcfa: number
  total_withdrawn_fcfa: number
  is_available: boolean
  verification_status: VerificationStatus
  /** Échantillon de voix (démo facultative) */
  sample_storage_path: string | null
  sample_duration_seconds: number | null
  sample_recorded_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  target_language: string
  language_label: string | null
  usage_type: ProjectUsageType
  status: ProjectStatus
  settings: Record<string, unknown>
  // Champs marketplace locuteurs
  is_public: boolean
  rate_per_hour_fcfa: number
  min_speakers: number | null
  max_speakers: number | null
  required_languages: string[]
  required_dialects: string[]
  required_gender: RequiredGender | null
  age_min: number | null
  age_max: number | null
  funding_source: string | null
  created_at: string
  updated_at: string
}

export interface Phrase {
  id: string
  project_id: string
  position: number
  content: string
  normalized_content: string | null
  created_at: string
}

export type SubtopicStatus = 'pending' | 'generating' | 'ready' | 'validated' | 'failed'
export type SubtopicSource = 'ai' | 'manual'

export interface Subtopic {
  id: string
  project_id: string
  position: number
  title: string
  description: string | null
  target_count: number
  source: SubtopicSource
  status: SubtopicStatus
  generated_count: number
  failed_reason: string | null
  created_at: string
  generated_at: string | null
  validated_at: string | null
}

export interface PhraseDraft {
  id: string
  subtopic_id: string
  project_id: string
  position: number
  content: string
  edited: boolean
  created_at: string
}

export interface RecordingSession {
  id: string
  project_id: string
  token: string
  speaker_name: string | null
  speaker_metadata: {
    age?: number
    gender?: string
    dialect?: string
    city?: string
  }
  status: SessionStatus
  total_recorded: number
  // Nullable pour compat rétro : NULL = session anonyme token
  speaker_id: string | null
  invitation_id: string | null
  created_at: string
  expires_at: string
}

export interface Recording {
  id: string
  session_id: string
  project_id: string
  phrase_id: string
  raw_storage_path: string
  processed_storage_path: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  processing_status: RecordingStatus
  is_valid: boolean | null
  snr_db: number | null
  clipping_pct: number | null
  silence_ratio: number | null
  speech_energy: number | null
  dc_offset: number | null
  mos_signal: number | null
  mos_noise: number | null
  mos_overall: number | null
  rejection_reasons: string[] | null
  qc_profile_used: string | null
  uploaded_at: string
  processed_at: string | null
}

export interface Export {
  id: string
  project_id: string
  format: ExportFormat
  storage_path: string | null
  total_segments: number | null
  total_duration_seconds: number | null
  file_size_bytes: number | null
  filters_applied: Record<string, unknown>
  status: ExportStatus
  completed_at: string | null
  error_message: string | null
  recording_count: number | null
  created_at: string
}

export interface ProjectInvitation {
  id: string
  project_id: string
  speaker_id: string
  invited_by: string | null
  message: string | null
  status: InvitationStatus
  responded_at: string | null
  created_at: string
  expires_at: string
  rate_snapshot_fcfa: number | null
  estimated_duration_minutes: number | null
  cancelled_at: string | null
  cancelled_by: string | null
  reminded_at: string | null
}

export interface WalletTransaction {
  id: string
  speaker_id: string
  amount_fcfa: number
  type: WalletTransactionType
  status: WalletTransactionStatus
  reference_table: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface Withdrawal {
  id: string
  speaker_id: string
  amount_fcfa: number
  method: WithdrawalMethod
  destination: string
  status: WithdrawalStatus
  processed_by: string | null
  processed_at: string | null
  rejection_reason: string | null
  transaction_reference: string | null
  created_at: string
}

// Résultat de la RPC get_available_projects
export interface AvailableProject {
  project_id: string
  project_name: string
  language_label: string | null
  target_language: string
  usage_type: ProjectUsageType
  rate_per_hour_fcfa: number
  is_public: boolean
  phrase_count: number
  funding_source: string | null
  invitation_status: InvitationStatus | null
}

// ── Type Database (client Supabase typé) ──────────────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      speaker_profiles: {
        Row: SpeakerProfile
        Insert: Omit<SpeakerProfile,
          | 'reliability_score' | 'total_recordings' | 'total_validated'
          | 'total_duration_seconds' | 'is_certified' | 'certified_at'
          | 'certified_by' | 'wallet_balance_fcfa' | 'total_earned_fcfa'
          | 'total_withdrawn_fcfa' | 'verification_status' | 'created_at'
          | 'updated_at'
        > & {
          reliability_score?: number
          verification_status?: VerificationStatus
        }
        Update: Partial<SpeakerProfile>
      }
      projects: {
        Row: Project
        Insert: Omit<Project,
          | 'id' | 'created_at' | 'updated_at' | 'status' | 'settings'
          | 'is_public' | 'rate_per_hour_fcfa' | 'required_languages'
          | 'required_dialects'
        > & {
          id?: string
          status?: ProjectStatus
          settings?: Record<string, unknown>
          is_public?: boolean
          rate_per_hour_fcfa?: number
          required_languages?: string[]
          required_dialects?: string[]
        }
        Update: Partial<Project>
      }
      phrases: {
        Row: Phrase
        Insert: Omit<Phrase, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Phrase>
      }
      recording_sessions: {
        Row: RecordingSession
        Insert: Omit<RecordingSession,
          | 'id' | 'token' | 'created_at' | 'expires_at'
          | 'total_recorded' | 'status' | 'speaker_id' | 'invitation_id'
        > & {
          id?: string
          token?: string
          status?: SessionStatus
          speaker_name?: string | null
          speaker_metadata?: Record<string, unknown>
          speaker_id?: string | null
          invitation_id?: string | null
        }
        Update: Partial<RecordingSession>
      }
      recordings: {
        Row: Recording
        Insert: Omit<Recording, 'id' | 'uploaded_at' | 'processing_status'> & {
          id?: string
          processing_status?: RecordingStatus
        }
        Update: Partial<Recording>
      }
      exports: {
        Row: Export
        Insert: Omit<Export, 'id' | 'created_at' | 'status'> & {
          id?: string
          status?: ExportStatus
        }
        Update: Partial<Export>
      }
      project_invitations: {
        Row: ProjectInvitation
        Insert: Omit<ProjectInvitation,
          | 'id' | 'created_at' | 'expires_at' | 'status' | 'responded_at'
        > & {
          id?: string
          status?: InvitationStatus
        }
        Update: Partial<ProjectInvitation>
      }
      wallet_transactions: {
        Row: WalletTransaction
        Insert: Omit<WalletTransaction, 'id' | 'created_at' | 'status'> & {
          id?: string
          status?: WalletTransactionStatus
        }
        Update: Partial<WalletTransaction>
      }
      withdrawals: {
        Row: Withdrawal
        Insert: Omit<Withdrawal,
          | 'id' | 'created_at' | 'status' | 'processed_by'
          | 'processed_at' | 'rejection_reason' | 'transaction_reference'
        > & {
          id?: string
          status?: WithdrawalStatus
        }
        Update: Partial<Withdrawal>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_available_projects: {
        Args: { p_speaker_id: string }
        Returns: AvailableProject[]
      }
    }
    Enums: Record<string, never>
  }
}
