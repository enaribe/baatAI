-- =============================================
-- Baat-IA — Migration 033 : favoris locuteurs + listing global
-- =============================================
-- Permet aux clients de favoriser des locuteurs et d'explorer la base
-- globale hors contexte projet.
-- =============================================

-- 1. Table favoris
CREATE TABLE IF NOT EXISTS public.client_favorite_speakers (
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_client_fav_speakers_client
  ON public.client_favorite_speakers(client_id, created_at DESC);

-- RLS : un client ne voit et ne modifie que ses propres favoris
ALTER TABLE public.client_favorite_speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client manages own favorites" ON public.client_favorite_speakers;
CREATE POLICY "Client manages own favorites"
  ON public.client_favorite_speakers
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- 2. RPC list_speakers — liste paginable/filtrable sans contexte projet
-- Retourne les locuteurs disponibles + marqueur is_favorite pour le client courant.
DROP FUNCTION IF EXISTS public.list_speakers(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, INT);

CREATE FUNCTION public.list_speakers(
  p_search TEXT DEFAULT NULL,
  p_lang TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_certified_only BOOLEAN DEFAULT FALSE,
  p_favorites_only BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 60,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  speaker_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  gender TEXT,
  languages TEXT[],
  dialects JSONB,
  reliability_score DOUBLE PRECISION,
  is_certified BOOLEAN,
  total_recordings INT,
  total_validated INT,
  is_favorite BOOLEAN,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id AS speaker_id,
    pr.full_name,
    sp.avatar_url,
    sp.city,
    sp.gender,
    sp.languages,
    sp.dialects,
    sp.reliability_score,
    sp.is_certified,
    sp.total_recordings,
    sp.total_validated,
    EXISTS (
      SELECT 1 FROM public.client_favorite_speakers fav
      WHERE fav.client_id = auth.uid() AND fav.speaker_id = sp.id
    ) AS is_favorite,
    sp.created_at
  FROM public.speaker_profiles sp
  JOIN public.profiles pr ON pr.id = sp.id
  WHERE sp.is_available = TRUE
    AND (p_search IS NULL OR p_search = ''
         OR pr.full_name ILIKE '%' || p_search || '%'
         OR sp.city ILIKE '%' || p_search || '%')
    AND (p_lang IS NULL OR p_lang = '' OR p_lang = ANY(sp.languages))
    AND (p_gender IS NULL OR p_gender = '' OR sp.gender = p_gender)
    AND (p_certified_only IS FALSE OR sp.is_certified = TRUE)
    AND (
      p_favorites_only IS FALSE
      OR EXISTS (
        SELECT 1 FROM public.client_favorite_speakers fav
        WHERE fav.client_id = auth.uid() AND fav.speaker_id = sp.id
      )
    )
  ORDER BY sp.reliability_score DESC, sp.total_validated DESC, sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. RPC get_speaker_detail — détail d'un locuteur pour la page profil
DROP FUNCTION IF EXISTS public.get_speaker_detail(UUID);

CREATE FUNCTION public.get_speaker_detail(p_speaker_id UUID)
RETURNS TABLE (
  speaker_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  country TEXT,
  gender TEXT,
  date_of_birth DATE,
  bio TEXT,
  languages TEXT[],
  dialects JSONB,
  reliability_score DOUBLE PRECISION,
  is_certified BOOLEAN,
  total_recordings INT,
  total_validated INT,
  total_duration_seconds DOUBLE PRECISION,
  is_favorite BOOLEAN,
  shared_projects_count INT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    pr.full_name,
    sp.avatar_url,
    sp.city,
    sp.country,
    sp.gender,
    sp.date_of_birth,
    sp.bio,
    sp.languages,
    sp.dialects,
    sp.reliability_score,
    sp.is_certified,
    sp.total_recordings,
    sp.total_validated,
    sp.total_duration_seconds,
    EXISTS (
      SELECT 1 FROM public.client_favorite_speakers fav
      WHERE fav.client_id = auth.uid() AND fav.speaker_id = sp.id
    ) AS is_favorite,
    (
      SELECT COUNT(DISTINCT rs.project_id)::INT
      FROM public.recording_sessions rs
      JOIN public.projects pj ON pj.id = rs.project_id
      WHERE rs.speaker_id = sp.id
        AND pj.owner_id = auth.uid()
    ) AS shared_projects_count,
    sp.created_at
  FROM public.speaker_profiles sp
  JOIN public.profiles pr ON pr.id = sp.id
  WHERE sp.id = p_speaker_id
    AND sp.is_available = TRUE;
END;
$$;
