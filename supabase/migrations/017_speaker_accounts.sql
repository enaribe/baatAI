-- =============================================
-- Baat-IA — Migration 017 : Comptes locuteurs
-- Tables : speaker_profiles, project_invitations,
--          wallet_transactions, withdrawals
-- Colonnes ajoutées : profiles.role, projects.*, recording_sessions.*
-- =============================================

-- 1. Ajouter 'speaker' au rôle
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('client', 'admin', 'speaker'));

-- =====================
-- SPEAKER_PROFILES (1-1 avec profiles)
-- =====================
CREATE TABLE public.speaker_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Identité
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  city TEXT,
  country TEXT DEFAULT 'SN',

  -- Compétences linguistiques
  languages TEXT[] NOT NULL DEFAULT '{}',
  -- { "wol": ["dakar","saint-louis"], "pul": ["fouta"] }
  dialects JSONB DEFAULT '{}',

  -- Qualité
  reliability_score FLOAT DEFAULT 1.0
    CHECK (reliability_score >= 0 AND reliability_score <= 1),
  total_recordings INT DEFAULT 0,
  total_validated INT DEFAULT 0,
  total_duration_seconds FLOAT DEFAULT 0,
  is_certified BOOLEAN DEFAULT FALSE,
  certified_at TIMESTAMPTZ,
  certified_by UUID REFERENCES public.profiles(id),

  -- Portefeuille (cache maintenu par trigger wallet_balance_update)
  wallet_balance_fcfa INT DEFAULT 0,
  total_earned_fcfa INT DEFAULT 0,
  total_withdrawn_fcfa INT DEFAULT 0,

  -- État du compte
  is_available BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- COLONNES SUPPLÉMENTAIRES SUR PROJECTS
-- =====================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rate_per_hour_fcfa INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_speakers INT,
  ADD COLUMN IF NOT EXISTS max_speakers INT,
  ADD COLUMN IF NOT EXISTS required_languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_dialects TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_gender TEXT
    CHECK (required_gender IN ('male', 'female', 'any')),
  ADD COLUMN IF NOT EXISTS age_min INT,
  ADD COLUMN IF NOT EXISTS age_max INT,
  ADD COLUMN IF NOT EXISTS funding_source TEXT;

-- =====================
-- PROJECT_INVITATIONS
-- =====================
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id),
  message TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  UNIQUE (project_id, speaker_id)
);

-- =====================
-- COLONNES SUPPLÉMENTAIRES SUR RECORDING_SESSIONS
-- =====================
ALTER TABLE public.recording_sessions
  ADD COLUMN IF NOT EXISTS speaker_id UUID REFERENCES public.speaker_profiles(id),
  ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES public.project_invitations(id);

-- =====================
-- WALLET_TRANSACTIONS (append-only, source de vérité solde)
-- =====================
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  -- positif = crédit, négatif = débit
  amount_fcfa INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'recording_validated',
    'validation_reward',
    'bonus',
    'withdrawal_request',
    'withdrawal_paid',
    'withdrawal_refund'
  )),
  status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'failed')),
  reference_table TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- WITHDRAWALS
-- =====================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  amount_fcfa INT NOT NULL CHECK (amount_fcfa > 0),
  method TEXT NOT NULL
    CHECK (method IN ('wave', 'orange_money', 'free_money', 'bank')),
  destination TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'failed')),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- INDEX
-- =====================
CREATE INDEX idx_speaker_profiles_languages ON public.speaker_profiles USING GIN (languages);
CREATE INDEX idx_speaker_profiles_verification ON public.speaker_profiles(verification_status);
CREATE INDEX idx_speaker_profiles_reliability ON public.speaker_profiles(reliability_score DESC);
CREATE INDEX idx_invitations_speaker ON public.project_invitations(speaker_id);
CREATE INDEX idx_invitations_project ON public.project_invitations(project_id);
CREATE INDEX idx_invitations_status ON public.project_invitations(status);
CREATE INDEX idx_sessions_speaker ON public.recording_sessions(speaker_id);
CREATE INDEX idx_wallet_speaker ON public.wallet_transactions(speaker_id, created_at DESC);
CREATE INDEX idx_wallet_type ON public.wallet_transactions(type, status);
CREATE INDEX idx_withdrawals_speaker ON public.withdrawals(speaker_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_projects_public ON public.projects(is_public, status)
  WHERE is_public = TRUE;

-- =====================
-- TRIGGER : met à jour wallet_balance_fcfa à chaque transaction confirmée
-- =====================
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.speaker_profiles
  SET
    wallet_balance_fcfa = wallet_balance_fcfa + NEW.amount_fcfa,
    total_earned_fcfa = CASE
      WHEN NEW.amount_fcfa > 0
        AND NEW.type IN ('recording_validated', 'validation_reward', 'bonus')
      THEN total_earned_fcfa + NEW.amount_fcfa
      ELSE total_earned_fcfa
    END,
    total_withdrawn_fcfa = CASE
      WHEN NEW.type = 'withdrawal_paid'
      THEN total_withdrawn_fcfa + ABS(NEW.amount_fcfa)
      ELSE total_withdrawn_fcfa
    END,
    updated_at = now()
  WHERE id = NEW.speaker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER wallet_balance_update
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION public.update_wallet_balance();

-- =====================
-- TRIGGER : crédite le wallet quand un recording est validé
-- =====================
CREATE OR REPLACE FUNCTION public.credit_speaker_on_validation()
RETURNS TRIGGER AS $$
DECLARE
  v_speaker_id UUID;
  v_rate INT;
  v_amount INT;
BEGIN
  -- Déclencher uniquement quand is_valid passe à TRUE
  IF NEW.is_valid = TRUE AND (OLD.is_valid IS NULL OR OLD.is_valid = FALSE) THEN
    SELECT rs.speaker_id, p.rate_per_hour_fcfa
      INTO v_speaker_id, v_rate
      FROM public.recording_sessions rs
      JOIN public.projects p ON p.id = rs.project_id
      WHERE rs.id = NEW.session_id;

    -- Skip si session anonyme (speaker_id = NULL) ou projet non rémunéré
    IF v_speaker_id IS NOT NULL
       AND v_rate > 0
       AND NEW.duration_seconds IS NOT NULL
       AND NEW.duration_seconds > 0
    THEN
      v_amount := ROUND((NEW.duration_seconds / 3600.0) * v_rate);
      IF v_amount > 0 THEN
        INSERT INTO public.wallet_transactions (
          speaker_id, amount_fcfa, type, status,
          reference_table, reference_id, description
        ) VALUES (
          v_speaker_id,
          v_amount,
          'recording_validated',
          'confirmed',
          'recordings',
          NEW.id,
          'Recording validé (' || ROUND(NEW.duration_seconds)::text || 's)'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_recording_validated
  AFTER UPDATE OF is_valid ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.credit_speaker_on_validation();

-- =====================
-- TRIGGER : updated_at sur speaker_profiles
-- =====================
CREATE OR REPLACE FUNCTION public.handle_speaker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER speaker_profiles_updated_at
  BEFORE UPDATE ON public.speaker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_speaker_updated_at();

-- =====================
-- FONCTION RPC : projets accessibles à un locuteur
-- =====================
CREATE OR REPLACE FUNCTION public.get_available_projects(p_speaker_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  language_label TEXT,
  target_language TEXT,
  usage_type TEXT,
  rate_per_hour_fcfa INT,
  is_public BOOLEAN,
  phrase_count BIGINT,
  funding_source TEXT,
  invitation_status TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.language_label,
    p.target_language,
    p.usage_type,
    p.rate_per_hour_fcfa,
    p.is_public,
    COUNT(DISTINCT ph.id) AS phrase_count,
    p.funding_source,
    pi.status AS invitation_status
  FROM public.projects p
  JOIN public.speaker_profiles sp ON sp.id = p_speaker_id
  LEFT JOIN public.phrases ph ON ph.project_id = p.id
  LEFT JOIN public.project_invitations pi
    ON pi.project_id = p.id AND pi.speaker_id = p_speaker_id
  WHERE p.status = 'active'
    AND (
      (
        p.is_public = TRUE
        AND (p.required_languages = '{}' OR sp.languages && p.required_languages)
        AND (p.required_gender IS NULL OR p.required_gender = 'any'
             OR p.required_gender = sp.gender)
      )
      OR (
        pi.speaker_id = p_speaker_id
        AND pi.status IN ('pending', 'accepted')
      )
    )
  GROUP BY p.id, p.name, p.language_label, p.target_language, p.usage_type,
           p.rate_per_hour_fcfa, p.is_public, p.funding_source, pi.status;
END;
$$ LANGUAGE plpgsql;
