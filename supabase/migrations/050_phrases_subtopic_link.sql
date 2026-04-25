-- =============================================
-- Daandé — Migration 050 : lien phrases ↔ subtopics
-- =============================================
-- Fix audit C3.
--
-- Problème : validate_subtopic et unvalidate_subtopic faisaient du matching
-- par content strict (`phrases.content IN (SELECT content FROM phrase_drafts...)`),
-- ce qui :
--   - supprime trop si 2 sous-thèmes ont la même phrase (ex "Naka nga def?")
--   - manque les phrases si le client édite content après validation
--
-- Solution : ajouter une FK directe phrases.subtopic_id qui trace l'origine.
-- - Les phrases existantes sans origine connue restent NULL
-- - Les nouvelles validations remplissent subtopic_id
-- - unvalidate_subtopic supprime par subtopic_id (exact)
-- =============================================


-- =====================
-- Colonne phrases.subtopic_id
-- =====================
ALTER TABLE public.phrases
  ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_phrases_subtopic ON public.phrases(subtopic_id);


-- =====================
-- Backfill : tenter de lier les phrases existantes par content strict
-- =====================
-- Pour chaque phrase sans subtopic_id, chercher un draft dans le projet
-- avec exactement le même content. Si un seul match, on lie.
-- En cas d'ambiguïté (plusieurs sous-thèmes ont généré la même phrase),
-- on laisse NULL : le client devra dévalider via une procédure manuelle.

WITH unique_matches AS (
  SELECT
    p.id AS phrase_id,
    (array_agg(d.subtopic_id))[1] AS sub_id,
    count(DISTINCT d.subtopic_id) AS match_count
  FROM public.phrases p
  JOIN public.phrase_drafts d
    ON d.project_id = p.project_id
    AND d.content = p.content
  WHERE p.subtopic_id IS NULL
  GROUP BY p.id
)
UPDATE public.phrases p
   SET subtopic_id = um.sub_id
  FROM unique_matches um
 WHERE p.id = um.phrase_id
   AND um.match_count = 1;


-- =====================
-- validate_subtopic : remplit subtopic_id à l'INSERT
-- =====================
CREATE OR REPLACE FUNCTION public.validate_subtopic(p_subtopic_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_status TEXT;
  v_max_position INT;
  v_inserted INT;
  v_existing_phrases INT;
  v_drafts_count INT;
  v_total_after INT;
  v_quota CONSTANT INT := 5000;
BEGIN
  SELECT s.project_id, p.owner_id, s.status
    INTO v_project_id, v_owner_id, v_status
    FROM public.subtopics s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = p_subtopic_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'subtopic_not_found' USING ERRCODE = '42704';
  END IF;

  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status <> 'ready' THEN
    RAISE EXCEPTION 'subtopic_not_ready' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_existing_phrases
    FROM public.phrases WHERE project_id = v_project_id;

  SELECT count(*) INTO v_drafts_count
    FROM public.phrase_drafts WHERE subtopic_id = p_subtopic_id;

  v_total_after := v_existing_phrases + v_drafts_count;

  IF v_total_after > v_quota THEN
    RAISE EXCEPTION
      'project_quota_exceeded: validation amènerait le projet à % phrases (limite %)',
      v_total_after, v_quota
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(position), 0) INTO v_max_position
    FROM public.phrases WHERE project_id = v_project_id;

  -- Copie incrémentale en remplissant subtopic_id pour traçabilité exacte
  WITH inserted AS (
    INSERT INTO public.phrases (project_id, position, content, subtopic_id)
    SELECT
      v_project_id,
      v_max_position + ROW_NUMBER() OVER (ORDER BY position),
      content,
      p_subtopic_id
    FROM public.phrase_drafts
    WHERE subtopic_id = p_subtopic_id
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  UPDATE public.subtopics
    SET status = 'validated', validated_at = now()
    WHERE id = p_subtopic_id;

  RETURN v_inserted;
END;
$$;


-- =====================
-- unvalidate_subtopic : matching par subtopic_id (exact)
-- =====================
-- Garde-fou recordings : aussi par FK directe maintenant.
-- Pour les phrases backfilled (subtopic_id NULL), on tombe en mode "matching
-- par content" comme avant — mais avec une exception explicite si ambiguïté.
CREATE OR REPLACE FUNCTION public.unvalidate_subtopic(p_subtopic_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_status TEXT;
  v_recordings_count INT;
  v_deleted INT;
  v_orphan_count INT;
BEGIN
  SELECT s.project_id, p.owner_id, s.status
    INTO v_project_id, v_owner_id, v_status
    FROM public.subtopics s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = p_subtopic_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'subtopic_not_found' USING ERRCODE = '42704';
  END IF;

  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status <> 'validated' THEN
    RAISE EXCEPTION 'subtopic_not_validated' USING ERRCODE = '22023';
  END IF;

  -- Garde-fou recordings : matching exact par FK
  SELECT COUNT(*) INTO v_recordings_count
    FROM public.recordings r
    JOIN public.phrases p ON p.id = r.phrase_id
    WHERE p.subtopic_id = p_subtopic_id;

  IF v_recordings_count > 0 THEN
    RAISE EXCEPTION
      'has_recordings: % enregistrement(s) existent déjà sur ce sous-thème. Contactez un admin pour intervenir.',
      v_recordings_count
      USING ERRCODE = 'P0001';
  END IF;

  -- Détecte les phrases ambiguës (anciennes, sans subtopic_id) qui matchent
  -- par content avec ce sous-thème. On refuse de les supprimer car on ne sait
  -- pas si elles sont vraiment de ce sous-thème.
  SELECT COUNT(*) INTO v_orphan_count
    FROM public.phrases p
   WHERE p.project_id = v_project_id
     AND p.subtopic_id IS NULL
     AND p.content IN (
       SELECT content FROM public.phrase_drafts WHERE subtopic_id = p_subtopic_id
     );

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION
      'orphan_phrases: % phrases anciennes ne peuvent être attribuées à ce sous-thème de manière fiable. Contactez un admin.',
      v_orphan_count
      USING ERRCODE = 'P0001';
  END IF;

  -- Suppression exacte par FK
  WITH deleted AS (
    DELETE FROM public.phrases
    WHERE subtopic_id = p_subtopic_id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  UPDATE public.subtopics
    SET status = 'ready', validated_at = NULL
    WHERE id = p_subtopic_id;

  RETURN v_deleted;
END;
$$;
