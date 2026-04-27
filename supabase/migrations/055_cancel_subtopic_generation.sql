-- =============================================
-- Daandé — Migration 055 : annuler la génération d'un sous-thème
-- =============================================
-- Permet à un client de stopper une génération en cours.
-- L'edge function check le statut entre chaque batch et s'arrête si failed.
--
-- Ne tue pas les batches Gemini en vol (impossible) mais empêche les batches
-- suivants d'être lancés. Économise des tokens Gemini.
-- =============================================

CREATE OR REPLACE FUNCTION public.cancel_subtopic_generation(p_subtopic_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
  v_status TEXT;
BEGIN
  SELECT p.owner_id, s.status
    INTO v_owner_id, v_status
    FROM public.subtopics s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = p_subtopic_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'subtopic_not_found' USING ERRCODE = '42704';
  END IF;

  -- Owner ou admin uniquement
  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Ne fait rien si pas en generating (idempotent)
  IF v_status <> 'generating' THEN
    RETURN false;
  END IF;

  -- Marque comme failed avec raison explicite
  -- Le trigger protect_subtopics_columns autorise car SECURITY DEFINER tourne en superuser
  UPDATE public.subtopics
     SET status = 'failed',
         failed_reason = 'Annulée par l''utilisateur'
   WHERE id = p_subtopic_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_subtopic_generation(UUID) TO authenticated;
