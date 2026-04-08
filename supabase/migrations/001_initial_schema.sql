-- =============================================
-- Baat-IA — Migration 001 : Schéma initial
-- =============================================

-- Extension requise pour gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =====================
-- PROFILES (extension de auth.users)
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  organization TEXT,
  role TEXT CHECK (role IN ('client', 'admin')) DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger auto-création du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- PROJECTS
-- =====================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  target_language TEXT NOT NULL,
  language_label TEXT,
  usage_type TEXT DEFAULT 'asr'
    CHECK (usage_type IN ('asr', 'tts', 'both')),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'processing', 'completed', 'archived')),
  settings JSONB DEFAULT '{
    "sample_rate": 16000,
    "export_format": "ljspeech"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PHRASES (texte à lire)
-- =====================
CREATE TABLE public.phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INT NOT NULL,
  content TEXT NOT NULL,
  normalized_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, position)
);

-- =====================
-- RECORDING SESSIONS (1 session = 1 locuteur invité)
-- =====================
CREATE TABLE public.recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  speaker_name TEXT,
  speaker_metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed')),
  total_recorded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- =====================
-- RECORDINGS (1 enregistrement = 1 phrase lue par 1 locuteur)
-- =====================
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  phrase_id UUID NOT NULL REFERENCES public.phrases(id),
  raw_storage_path TEXT NOT NULL,
  processed_storage_path TEXT,
  duration_seconds FLOAT,
  file_size_bytes BIGINT,
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  is_valid BOOLEAN,
  snr_db FLOAT,
  clipping_pct FLOAT,
  silence_ratio FLOAT,
  rejection_reasons TEXT[],
  qc_profile_used TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- =====================
-- EXPORTS
-- =====================
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  format TEXT NOT NULL
    CHECK (format IN ('ljspeech', 'huggingface', 'csv_wav')),
  storage_path TEXT,
  total_segments INT,
  total_duration_seconds FLOAT,
  file_size_bytes BIGINT,
  filters_applied JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- INDEX
-- =====================
CREATE INDEX idx_phrases_project ON public.phrases(project_id, position);
CREATE INDEX idx_recordings_session ON public.recordings(session_id);
CREATE INDEX idx_recordings_project ON public.recordings(project_id);
CREATE INDEX idx_recordings_phrase ON public.recordings(phrase_id);
CREATE INDEX idx_recordings_status ON public.recordings(processing_status);
CREATE INDEX idx_recordings_valid ON public.recordings(project_id, is_valid);
CREATE INDEX idx_sessions_token ON public.recording_sessions(token);
CREATE INDEX idx_sessions_project ON public.recording_sessions(project_id);
CREATE INDEX idx_exports_project ON public.exports(project_id);
