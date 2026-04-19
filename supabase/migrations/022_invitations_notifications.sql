-- =============================================
-- Baat-IA — Migration 022 : invitations enrichies + notifications
-- =============================================

-- =====================
-- 1. project_invitations : nouvelles colonnes + statut 'cancelled'
-- =====================

ALTER TABLE public.project_invitations
  ADD COLUMN IF NOT EXISTS rate_snapshot_fcfa INT,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- Élargir la CHECK contraindre de status pour inclure 'cancelled'
ALTER TABLE public.project_invitations DROP CONSTRAINT IF EXISTS project_invitations_status_check;
ALTER TABLE public.project_invitations
  ADD CONSTRAINT project_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_invitations_pending_speaker
  ON public.project_invitations(speaker_id)
  WHERE status = 'pending';

-- =====================
-- 2. Table notifications
-- =====================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User updates own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les INSERT passent par service_role ou via triggers SECURITY DEFINER

-- =====================
-- 3. Triggers pour créer des notifications
-- =====================

-- Quand une invitation est créée : notifier le speaker
CREATE OR REPLACE FUNCTION public.notify_invitation_created()
RETURNS trigger AS $$
DECLARE
  v_project RECORD;
BEGIN
  SELECT name, language_label, target_language, rate_per_hour_fcfa
  INTO v_project
  FROM public.projects
  WHERE id = NEW.project_id;

  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (
    NEW.speaker_id,
    'invitation_received',
    jsonb_build_object(
      'invitation_id', NEW.id,
      'project_id', NEW.project_id,
      'project_name', v_project.name,
      'language_label', v_project.language_label,
      'target_language', v_project.target_language,
      'rate_per_hour_fcfa', COALESCE(NEW.rate_snapshot_fcfa, v_project.rate_per_hour_fcfa),
      'message', NEW.message,
      'expires_at', NEW.expires_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS invitation_notify_created ON public.project_invitations;
CREATE TRIGGER invitation_notify_created
  AFTER INSERT ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invitation_created();

-- Quand une invitation change de statut : notifier le client qui a invité
CREATE OR REPLACE FUNCTION public.notify_invitation_status_change()
RETURNS trigger AS $$
DECLARE
  v_project RECORD;
  v_speaker_name TEXT;
  v_notif_type TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Ignorer les transitions non pertinentes
  IF NEW.status NOT IN ('accepted', 'declined') THEN
    RETURN NEW;
  END IF;

  IF NEW.invited_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project FROM public.projects WHERE id = NEW.project_id;

  SELECT full_name INTO v_speaker_name
  FROM public.profiles
  WHERE id = NEW.speaker_id;

  v_notif_type := CASE
    WHEN NEW.status = 'accepted' THEN 'invitation_accepted'
    ELSE 'invitation_declined'
  END;

  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (
    NEW.invited_by,
    v_notif_type,
    jsonb_build_object(
      'invitation_id', NEW.id,
      'project_id', NEW.project_id,
      'project_name', v_project.name,
      'speaker_id', NEW.speaker_id,
      'speaker_name', v_speaker_name,
      'responded_at', NEW.responded_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS invitation_notify_status_change ON public.project_invitations;
CREATE TRIGGER invitation_notify_status_change
  AFTER UPDATE OF status ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invitation_status_change();

-- =====================
-- 4. RPC match_speakers_for_project
-- =====================
-- Score 0-100 :
--   Langue (40) : 40 si toutes les langues requises couvertes,
--                 20 si au moins une, 0 sinon
--   Genre (10)  : 10 si match ou pas d'exigence
--   Dialecte (20) : 20 si dialecte requis présent, 10 si langue
--                   requise présente mais pas de dialecte exigé, 0 sinon
--   Fiabilité (20) : reliability_score × 20
--   Activité récente (10) : 10 si enregistrement validé dans les 30j
-- Exclut les speakers déjà invités (pending/accepted) ou avec session active

CREATE OR REPLACE FUNCTION public.match_speakers_for_project(
  p_project_id UUID,
  p_search TEXT DEFAULT NULL,
  p_filter_gender TEXT DEFAULT NULL,
  p_filter_certified BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  speaker_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  gender TEXT,
  languages TEXT[],
  dialects JSONB,
  reliability_score NUMERIC,
  is_certified BOOLEAN,
  total_validated INT,
  match_score INT,
  invitation_status TEXT,
  has_active_session BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project RECORD;
BEGIN
  SELECT
    p.required_languages,
    p.required_dialects,
    p.required_gender,
    p.owner_id
  INTO v_project
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF v_project IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH speakers_filtered AS (
    SELECT
      sp.id,
      pr.full_name,
      sp.avatar_url,
      sp.city,
      sp.gender,
      sp.languages,
      sp.dialects,
      sp.reliability_score,
      sp.is_certified,
      sp.total_validated
    FROM public.speaker_profiles sp
    JOIN public.profiles pr ON pr.id = sp.id
    WHERE sp.verification_status = 'approved'
      AND sp.is_available = TRUE
      AND (p_search IS NULL OR p_search = ''
           OR pr.full_name ILIKE '%' || p_search || '%'
           OR sp.city ILIKE '%' || p_search || '%')
      AND (p_filter_gender IS NULL OR p_filter_gender = ''
           OR sp.gender = p_filter_gender)
      AND (p_filter_certified IS FALSE OR sp.is_certified = TRUE)
  ),
  scored AS (
    SELECT
      sf.*,
      -- Langue
      CASE
        WHEN v_project.required_languages IS NULL OR cardinality(v_project.required_languages) = 0 THEN 20
        WHEN sf.languages @> v_project.required_languages THEN 40
        WHEN sf.languages && v_project.required_languages THEN 20
        ELSE 0
      END AS lang_score,
      -- Genre
      CASE
        WHEN v_project.required_gender IS NULL OR v_project.required_gender = 'any' THEN 10
        WHEN sf.gender = v_project.required_gender THEN 10
        ELSE 0
      END AS gender_score,
      -- Dialectes : simple bonus si la langue requise est présente
      CASE
        WHEN v_project.required_dialects IS NULL OR cardinality(v_project.required_dialects) = 0 THEN 10
        WHEN sf.dialects IS NOT NULL AND sf.dialects != '{}'::jsonb THEN 20
        ELSE 0
      END AS dialect_score,
      -- Fiabilité
      LEAST(20, GREATEST(0, ROUND(sf.reliability_score * 20)::INT)) AS reliability_pts,
      -- Activité récente (recording validé dans les 30j)
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.recordings r
          JOIN public.recording_sessions rs ON rs.id = r.session_id
          WHERE rs.speaker_id = sf.id
            AND r.is_valid = TRUE
            AND r.processed_at > now() - interval '30 days'
        ) THEN 10
        ELSE 0
      END AS activity_score
    FROM speakers_filtered sf
  )
  SELECT
    s.id AS speaker_id,
    s.full_name,
    s.avatar_url,
    s.city,
    s.gender,
    s.languages,
    s.dialects,
    s.reliability_score,
    s.is_certified,
    s.total_validated,
    (s.lang_score + s.gender_score + s.dialect_score + s.reliability_pts + s.activity_score)::INT AS match_score,
    pi.status AS invitation_status,
    EXISTS (
      SELECT 1 FROM public.recording_sessions rs
      WHERE rs.speaker_id = s.id
        AND rs.project_id = p_project_id
        AND rs.status IN ('active', 'pending')
    ) AS has_active_session
  FROM scored s
  LEFT JOIN public.project_invitations pi
    ON pi.project_id = p_project_id
    AND pi.speaker_id = s.id
    AND pi.status IN ('pending', 'accepted')
  ORDER BY
    (s.lang_score + s.gender_score + s.dialect_score + s.reliability_pts + s.activity_score) DESC,
    s.reliability_score DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_speakers_for_project(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
