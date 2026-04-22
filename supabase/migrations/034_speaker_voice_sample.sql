-- =============================================
-- Baat-IA — Migration 034 : échantillon de voix pour les locuteurs
-- =============================================
-- Les locuteurs peuvent enregistrer une courte démo (30-60s) visible
-- par les clients avant invitation.
-- =============================================

-- 1. Colonnes sur speaker_profiles
ALTER TABLE public.speaker_profiles
  ADD COLUMN IF NOT EXISTS sample_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS sample_duration_seconds FLOAT,
  ADD COLUMN IF NOT EXISTS sample_recorded_at TIMESTAMPTZ;

-- 2. Bucket public pour les samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('speaker-samples', 'speaker-samples', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- 3. Policies storage pour le bucket speaker-samples
-- INSERT : un locuteur authentifié peut uploader son propre sample
DROP POLICY IF EXISTS "Speakers upload own sample" ON storage.objects;
CREATE POLICY "Speakers upload own sample"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'speaker-samples'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );

-- UPDATE : pour les resumable uploads TUS
DROP POLICY IF EXISTS "Speakers update own sample" ON storage.objects;
CREATE POLICY "Speakers update own sample"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'speaker-samples'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );

-- DELETE : le locuteur peut supprimer son propre sample
DROP POLICY IF EXISTS "Speakers delete own sample" ON storage.objects;
CREATE POLICY "Speakers delete own sample"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'speaker-samples'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );

-- SELECT : bucket public, accès libre à la lecture
DROP POLICY IF EXISTS "Public read speaker samples" ON storage.objects;
CREATE POLICY "Public read speaker samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'speaker-samples');

-- 4. Exposer les nouvelles colonnes dans la RPC get_speaker_detail
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
  sample_storage_path TEXT,
  sample_duration_seconds FLOAT,
  sample_recorded_at TIMESTAMPTZ,
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
    sp.sample_storage_path,
    sp.sample_duration_seconds,
    sp.sample_recorded_at,
    sp.created_at
  FROM public.speaker_profiles sp
  JOIN public.profiles pr ON pr.id = sp.id
  WHERE sp.id = p_speaker_id
    AND sp.is_available = TRUE;
END;
$$;

-- 5. Exposer aussi dans list_speakers
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
  sample_storage_path TEXT,
  sample_duration_seconds FLOAT,
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
    sp.sample_storage_path,
    sp.sample_duration_seconds,
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
