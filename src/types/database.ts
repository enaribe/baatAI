export type ProjectUsageType = 'asr' | 'tts' | 'both'
export type ProjectStatus = 'draft' | 'active' | 'processing' | 'completed' | 'archived'
export type SessionStatus = 'pending' | 'active' | 'completed'
export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ExportFormat = 'ljspeech' | 'huggingface' | 'csv_wav'
export type ExportStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type UserRole = 'client' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  organization: string | null
  role: UserRole
  created_at: string
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
  created_at: string
}

// Type Database pour le client Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'status' | 'settings'> & {
          id?: string
          status?: ProjectStatus
          settings?: Record<string, unknown>
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
        Insert: Omit<RecordingSession, 'id' | 'token' | 'created_at' | 'expires_at' | 'total_recorded' | 'status'> & {
          id?: string
          token?: string
          status?: SessionStatus
          speaker_name?: string | null
          speaker_metadata?: Record<string, unknown>
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
