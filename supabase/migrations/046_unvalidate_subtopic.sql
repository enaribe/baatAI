-- =============================================
-- Daandé — Migration 046 : dévalidation d'un sous-thème
-- =============================================
-- Permet à un client de revenir sur la validation d'un sous-thème pour
-- éditer ses phrases avant que des locuteurs commencent à enregistrer.
--
-- Garde-fou : refuse la dévalidation si AU MOINS UNE phrase liée a déjà
-- un recording (peu importe son statut). Évite de détruire le travail
-- fait par les locuteurs.
--
-- Stratégie de matching draft → phrase :
--   On retrouve les phrases du projet qui ont un `content` strictement
--   égal au content d'un draft du sous-thème. Suffisant tant que les
--   contenus sont uniques par projet (cas réel : Gemini ne génère pas
--   de doublons et le client n'aura pas créé manuellement la même phrase).
-- =============================================

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
BEGIN
  -- Récupère projet + owner + statut
  SELECT s.project_id, p.owner_id, s.status
    INTO v_project_id, v_owner_id, v_status
    FROM public.subtopics s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = p_subtopic_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'subtopic_not_found' USING ERRCODE = '42704';
  END IF;

  -- Owner ou admin uniquement
  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status <> 'validated' THEN
    RAISE EXCEPTION 'subtopic_not_validated' USING ERRCODE = '22023';
  END IF;

  -- Garde-fou : vérifie qu'aucun recording n'existe sur les phrases liées.
  -- Match par content strict : suffisant car les phrases d'un projet
  -- n'ont pas de doublons (UNIQUE n'est pas en place mais c'est un invariant).
  SELECT COUNT(*) INTO v_recordings_count
    FROM public.recordings r
    JOIN public.phrases p ON p.id = r.phrase_id
    WHERE p.project_id = v_project_id
      AND p.content IN (
        SELECT content FROM public.phrase_drafts WHERE subtopic_id = p_subtopic_id
      );

  IF v_recordings_count > 0 THEN
    RAISE EXCEPTION 'has_recordings: % enregistrement(s) existent déjà sur ce sous-thème. Contactez un admin pour intervenir.', v_recordings_count
      USING ERRCODE = 'P0001';
  END IF;

  -- Supprime les phrases du projet qui correspondent aux drafts
  WITH deleted AS (
    DELETE FROM public.phrases
    WHERE project_id = v_project_id
      AND content IN (
        SELECT content FROM public.phrase_drafts WHERE subtopic_id = p_subtopic_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  -- Repasse le sous-thème en ready
  UPDATE public.subtopics
    SET status = 'ready', validated_at = NULL
    WHERE id = p_subtopic_id;

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unvalidate_subtopic(UUID) TO authenticated;
