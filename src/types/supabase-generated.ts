export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          expected_volume: string | null
          full_name: string
          id: string
          intended_role: string
          organization: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          speaker_age_range: string | null
          speaker_city: string | null
          speaker_gender: string | null
          speaker_languages: string[] | null
          speaker_motivation: string | null
          status: string
          target_languages: string[] | null
          use_case: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          expected_volume?: string | null
          full_name: string
          id?: string
          intended_role: string
          organization?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_age_range?: string | null
          speaker_city?: string | null
          speaker_gender?: string | null
          speaker_languages?: string[] | null
          speaker_motivation?: string | null
          status?: string
          target_languages?: string[] | null
          use_case?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          expected_volume?: string | null
          full_name?: string
          id?: string
          intended_role?: string
          organization?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_age_range?: string | null
          speaker_city?: string | null
          speaker_gender?: string | null
          speaker_languages?: string[] | null
          speaker_motivation?: string | null
          status?: string
          target_languages?: string[] | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          approved_at: string
          approved_by: string | null
          email: string
          expires_at: string | null
          invitation_token: string | null
          request_id: string | null
          role: string
          signed_up_user_id: string | null
          source: string
          used_at: string | null
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          email: string
          expires_at?: string | null
          invitation_token?: string | null
          request_id?: string | null
          role: string
          signed_up_user_id?: string | null
          source: string
          used_at?: string | null
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          email?: string
          expires_at?: string | null
          invitation_token?: string | null
          request_id?: string | null
          role?: string
          signed_up_user_id?: string | null
          source?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_emails_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowed_emails_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowed_emails_signed_up_user_id_fkey"
            columns: ["signed_up_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_favorite_speakers: {
        Row: {
          client_id: string
          created_at: string
          notes: string | null
          speaker_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          notes?: string | null
          speaker_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          notes?: string | null
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_favorite_speakers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_favorite_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          payload: Json | null
          recipient_email: string
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          filters_applied: Json | null
          format: string
          id: string
          project_id: string
          recording_count: number | null
          status: string | null
          storage_path: string | null
          total_duration_seconds: number | null
          total_segments: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          filters_applied?: Json | null
          format: string
          id?: string
          project_id: string
          recording_count?: number | null
          status?: string | null
          storage_path?: string | null
          total_duration_seconds?: number | null
          total_segments?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          filters_applied?: Json | null
          format?: string
          id?: string
          project_id?: string
          recording_count?: number | null
          status?: string | null
          storage_path?: string | null
          total_duration_seconds?: number | null
          total_segments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_validations: {
        Row: {
          confidence: string | null
          created_at: string | null
          id: string
          notes: string | null
          recording_id: string
          validator_id: string
          vote: boolean
        }
        Insert: {
          confidence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          recording_id: string
          validator_id: string
          vote: boolean
        }
        Update: {
          confidence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          recording_id?: string
          validator_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "peer_validations_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_validations_validator_id_fkey"
            columns: ["validator_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_drafts: {
        Row: {
          content: string
          created_at: string
          edited: boolean
          id: string
          position: number
          project_id: string
          source_text: string | null
          subtopic_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited?: boolean
          id?: string
          position: number
          project_id: string
          source_text?: string | null
          subtopic_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited?: boolean
          id?: string
          position?: number
          project_id?: string
          source_text?: string | null
          subtopic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrase_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_drafts_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      phrases: {
        Row: {
          content: string
          created_at: string | null
          id: string
          normalized_content: string | null
          position: number
          project_id: string
          subtopic_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          normalized_content?: string | null
          position: number
          project_id: string
          subtopic_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          normalized_content?: string | null
          position?: number
          project_id?: string
          subtopic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrases_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          full_name: string | null
          id: string
          organization: string | null
          role: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          role?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          role?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          estimated_duration_minutes: number | null
          expires_at: string | null
          id: string
          invited_by: string | null
          message: string | null
          project_id: string
          rate_snapshot_fcfa: number | null
          reminded_at: string | null
          responded_at: string | null
          speaker_id: string
          status: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          message?: string | null
          project_id: string
          rate_snapshot_fcfa?: number | null
          reminded_at?: string | null
          responded_at?: string | null
          speaker_id: string
          status?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          estimated_duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          message?: string | null
          project_id?: string
          rate_snapshot_fcfa?: number | null
          reminded_at?: string | null
          responded_at?: string | null
          speaker_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string | null
          description: string | null
          funding_source: string | null
          id: string
          is_public: boolean | null
          language_label: string | null
          max_speakers: number | null
          min_speakers: number | null
          name: string
          owner_id: string
          rate_per_hour_fcfa: number | null
          required_dialects: string[] | null
          required_gender: string | null
          required_languages: string[] | null
          settings: Json | null
          status: string | null
          target_language: string
          updated_at: string | null
          usage_type: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string | null
          description?: string | null
          funding_source?: string | null
          id?: string
          is_public?: boolean | null
          language_label?: string | null
          max_speakers?: number | null
          min_speakers?: number | null
          name: string
          owner_id: string
          rate_per_hour_fcfa?: number | null
          required_dialects?: string[] | null
          required_gender?: string | null
          required_languages?: string[] | null
          settings?: Json | null
          status?: string | null
          target_language: string
          updated_at?: string | null
          usage_type?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string | null
          description?: string | null
          funding_source?: string | null
          id?: string
          is_public?: boolean | null
          language_label?: string | null
          max_speakers?: number | null
          min_speakers?: number | null
          name?: string
          owner_id?: string
          rate_per_hour_fcfa?: number | null
          required_dialects?: string[] | null
          required_gender?: string | null
          required_languages?: string[] | null
          settings?: Json | null
          status?: string | null
          target_language?: string
          updated_at?: string | null
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          id: number
          ts: string
          user_id: string | null
        }
        Insert: {
          bucket: string
          id?: number
          ts?: string
          user_id?: string | null
        }
        Update: {
          bucket?: string
          id?: number
          ts?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recording_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invitation_id: string | null
          project_id: string
          speaker_id: string | null
          speaker_metadata: Json | null
          speaker_name: string | null
          status: string | null
          token: string
          total_recorded: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_id?: string | null
          project_id: string
          speaker_id?: string | null
          speaker_metadata?: Json | null
          speaker_name?: string | null
          status?: string | null
          token?: string
          total_recorded?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_id?: string | null
          project_id?: string
          speaker_id?: string | null
          speaker_metadata?: Json | null
          speaker_name?: string | null
          status?: string | null
          token?: string
          total_recorded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recording_sessions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "project_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_sessions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          clipping_pct: number | null
          dc_offset: number | null
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          is_valid: boolean | null
          mos_noise: number | null
          mos_overall: number | null
          mos_signal: number | null
          phrase_id: string
          processed_at: string | null
          processed_storage_path: string | null
          processing_status: string | null
          project_id: string
          qc_profile_used: string | null
          raw_storage_path: string
          rejection_reasons: string[] | null
          retry_count: number | null
          session_id: string
          silence_ratio: number | null
          snr_db: number | null
          speech_energy: number | null
          uploaded_at: string | null
        }
        Insert: {
          clipping_pct?: number | null
          dc_offset?: number | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_valid?: boolean | null
          mos_noise?: number | null
          mos_overall?: number | null
          mos_signal?: number | null
          phrase_id: string
          processed_at?: string | null
          processed_storage_path?: string | null
          processing_status?: string | null
          project_id: string
          qc_profile_used?: string | null
          raw_storage_path: string
          rejection_reasons?: string[] | null
          retry_count?: number | null
          session_id: string
          silence_ratio?: number | null
          snr_db?: number | null
          speech_energy?: number | null
          uploaded_at?: string | null
        }
        Update: {
          clipping_pct?: number | null
          dc_offset?: number | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          is_valid?: boolean | null
          mos_noise?: number | null
          mos_overall?: number | null
          mos_signal?: number | null
          phrase_id?: string
          processed_at?: string | null
          processed_storage_path?: string | null
          processing_status?: string | null
          project_id?: string
          qc_profile_used?: string | null
          raw_storage_path?: string
          rejection_reasons?: string[] | null
          retry_count?: number | null
          session_id?: string
          silence_ratio?: number | null
          snr_db?: number | null
          speech_energy?: number | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recording_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certified_at: string | null
          certified_by: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          dialects: Json | null
          gender: string | null
          id: string
          is_available: boolean | null
          is_certified: boolean | null
          languages: string[]
          phone: string | null
          reliability_score: number | null
          sample_duration_seconds: number | null
          sample_recorded_at: string | null
          sample_storage_path: string | null
          total_duration_seconds: number | null
          total_earned_fcfa: number | null
          total_recordings: number | null
          total_validated: number | null
          total_withdrawn_fcfa: number | null
          updated_at: string | null
          verification_status: string | null
          wallet_balance_fcfa: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certified_at?: string | null
          certified_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dialects?: Json | null
          gender?: string | null
          id: string
          is_available?: boolean | null
          is_certified?: boolean | null
          languages?: string[]
          phone?: string | null
          reliability_score?: number | null
          sample_duration_seconds?: number | null
          sample_recorded_at?: string | null
          sample_storage_path?: string | null
          total_duration_seconds?: number | null
          total_earned_fcfa?: number | null
          total_recordings?: number | null
          total_validated?: number | null
          total_withdrawn_fcfa?: number | null
          updated_at?: string | null
          verification_status?: string | null
          wallet_balance_fcfa?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certified_at?: string | null
          certified_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dialects?: Json | null
          gender?: string | null
          id?: string
          is_available?: boolean | null
          is_certified?: boolean | null
          languages?: string[]
          phone?: string | null
          reliability_score?: number | null
          sample_duration_seconds?: number | null
          sample_recorded_at?: string | null
          sample_storage_path?: string | null
          total_duration_seconds?: number | null
          total_earned_fcfa?: number | null
          total_recordings?: number | null
          total_validated?: number | null
          total_withdrawn_fcfa?: number | null
          updated_at?: string | null
          verification_status?: string | null
          wallet_balance_fcfa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speaker_profiles_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtopics: {
        Row: {
          created_at: string
          description: string | null
          failed_reason: string | null
          generated_at: string | null
          generated_count: number
          id: string
          position: number
          project_id: string
          source: string
          status: string
          target_count: number
          title: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          failed_reason?: string | null
          generated_at?: string | null
          generated_count?: number
          id?: string
          position: number
          project_id: string
          source?: string
          status?: string
          target_count: number
          title: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          failed_reason?: string | null
          generated_at?: string | null
          generated_count?: number
          id?: string
          position?: number
          project_id?: string
          source?: string
          status?: string
          target_count?: number
          title?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_fcfa: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_table: string | null
          speaker_id: string
          status: string | null
          type: string
        }
        Insert: {
          amount_fcfa: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          speaker_id: string
          status?: string | null
          type: string
        }
        Update: {
          amount_fcfa?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          speaker_id?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_fcfa: number
          created_at: string | null
          destination: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          speaker_id: string
          status: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount_fcfa: number
          created_at?: string | null
          destination: string
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          speaker_id: string
          status?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount_fcfa?: number
          created_at?: string | null
          destination?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          speaker_id?: string
          status?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speaker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _discord_webhook_url: { Args: never; Returns: string }
      _send_discord_alert: {
        Args: { color?: number; description: string; title: string }
        Returns: undefined
      }
      _sign_webhook: {
        Args: { body_text: string; ts: number }
        Returns: string
      }
      _trigger_process_segment: {
        Args: { p_recording_id: string }
        Returns: undefined
      }
      _webhook_hmac_secret: { Args: never; Returns: string }
      add_manual_subtopic: {
        Args: {
          p_description: string
          p_project_id: string
          p_target_count: number
          p_title: string
        }
        Returns: string
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role?: string
          p_search?: string
          p_status?: string
        }
        Returns: Json[]
      }
      admin_user_detail: { Args: { p_user_id: string }; Returns: Json }
      anonymize_speaker: { Args: { p_user_id: string }; Returns: undefined }
      auto_retry_stuck_recordings: { Args: never; Returns: number }
      check_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_sec: number }
        Returns: boolean
      }
      cleanup_old_raw_audio: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_subtopics_zombies: { Args: never; Returns: number }
      client_has_active_projects: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      delete_recording: { Args: { p_recording_id: string }; Returns: Json }
      get_available_projects: {
        Args: { p_speaker_id: string }
        Returns: {
          funding_source: string
          invitation_status: string
          is_public: boolean
          language_label: string
          phrase_count: number
          project_id: string
          project_name: string
          rate_per_hour_fcfa: number
          target_language: string
          usage_type: string
        }[]
      }
      get_speaker_detail: {
        Args: { p_speaker_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          created_at: string
          date_of_birth: string
          dialects: Json
          full_name: string
          gender: string
          is_certified: boolean
          is_favorite: boolean
          languages: string[]
          reliability_score: number
          sample_duration_seconds: number
          sample_recorded_at: string
          sample_storage_path: string
          shared_projects_count: number
          speaker_id: string
          total_duration_seconds: number
          total_recordings: number
          total_validated: number
        }[]
      }
      has_invitation_for_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      health_check_critical: { Args: never; Returns: undefined }
      health_check_warnings: { Args: never; Returns: undefined }
      health_daily_digest: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_approved_speaker: { Args: never; Returns: boolean }
      is_email_whitelisted: { Args: { p_email: string }; Returns: boolean }
      list_speakers: {
        Args: {
          p_certified_only?: boolean
          p_favorites_only?: boolean
          p_gender?: string
          p_lang?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          avatar_url: string
          city: string
          created_at: string
          dialects: Json
          full_name: string
          gender: string
          is_certified: boolean
          is_favorite: boolean
          languages: string[]
          reliability_score: number
          sample_duration_seconds: number
          sample_storage_path: string
          speaker_id: string
          total_recordings: number
          total_validated: number
        }[]
      }
      match_speakers_for_project: {
        Args: {
          p_filter_certified?: boolean
          p_filter_gender?: string
          p_project_id: string
          p_search?: string
        }
        Returns: {
          avatar_url: string
          city: string
          dialects: Json
          full_name: string
          gender: string
          has_active_session: boolean
          invitation_status: string
          is_certified: boolean
          languages: string[]
          match_score: number
          reliability_score: number
          sample_duration_seconds: number
          sample_storage_path: string
          speaker_id: string
          total_validated: number
        }[]
      }
      owns_project: { Args: { p_project_id: string }; Returns: boolean }
      project_target_total: { Args: { p_project_id: string }; Returns: number }
      retry_recording: { Args: { p_recording_id: string }; Returns: Json }
      unvalidate_subtopic: { Args: { p_subtopic_id: string }; Returns: number }
      validate_subtopic: { Args: { p_subtopic_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
