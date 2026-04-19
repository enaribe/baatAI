-- =============================================
-- Baat-IA — Migration 027 : nettoyage signatures match_speakers_for_project
-- =============================================
-- Le CREATE OR REPLACE de la migration 025 peut avoir coexisté avec l'ancienne
-- signature de 022 si les paramètres ou le RETURNS diffèrent. PostgREST retourne
-- alors 400 car il ne sait pas quelle version appeler.
--
-- On drop toutes les versions possibles puis on recrée une seule fois.
-- =============================================

-- Drop toutes les signatures possibles (ignore si absente)
DROP FUNCTION IF EXISTS public.match_speakers_for_project(UUID);
DROP FUNCTION IF EXISTS public.match_speakers_for_project(UUID, TEXT);
DROP FUNCTION IF EXISTS public.match_speakers_for_project(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.match_speakers_for_project(UUID, TEXT, TEXT, BOOLEAN);

CREATE FUNCTION public.match_speakers_for_project(
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
    WHERE sp.is_available = TRUE
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
      CASE
        WHEN v_project.required_languages IS NULL OR cardinality(v_project.required_languages) = 0 THEN 20
        WHEN sf.languages @> v_project.required_languages THEN 40
        WHEN sf.languages && v_project.required_languages THEN 20
        ELSE 0
      END AS lang_score,
      CASE
        WHEN v_project.required_gender IS NULL OR v_project.required_gender = 'any' THEN 10
        WHEN sf.gender = v_project.required_gender THEN 10
        ELSE 0
      END AS gender_score,
      CASE
        WHEN v_project.required_dialects IS NULL OR cardinality(v_project.required_dialects) = 0 THEN 10
        WHEN sf.dialects IS NOT NULL AND sf.dialects != '{}'::jsonb THEN 20
        ELSE 0
      END AS dialect_score,
      LEAST(20, GREATEST(0, ROUND(sf.reliability_score * 20)::INT)) AS reliability_pts,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.recordings r
          JOIN public.recording_sessions rs ON rs.id = r.session_id
          WHERE rs.speaker_id = sf.id
            AND r.is_valid = TRUE
            AND r.uploaded_at >= now() - interval '30 days'
        ) THEN 10
        ELSE 0
      END AS recent_activity_score
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
    (s.lang_score + s.gender_score + s.dialect_score + s.reliability_pts + s.recent_activity_score)::INT AS match_score,
    (
      SELECT pi.status
      FROM public.project_invitations pi
      WHERE pi.project_id = p_project_id AND pi.speaker_id = s.id
      ORDER BY pi.created_at DESC
      LIMIT 1
    ) AS invitation_status,
    EXISTS (
      SELECT 1 FROM public.recording_sessions rs
      WHERE rs.speaker_id = s.id
        AND rs.project_id = p_project_id
        AND rs.status IN ('pending', 'active')
    ) AS has_active_session
  FROM scored s
  ORDER BY match_score DESC, s.reliability_score DESC;
END;
$$;
