-- =============================================
-- Daandé — Migration 045 : génération assistée de phrases (Gemini)
-- =============================================
-- Permet aux clients de générer leurs phrases via IA en 2 temps :
--   1) Plan : Gemini propose N sous-thèmes équilibrés (table subtopics)
--   2) Génération : pour chaque sous-thème, Gemini génère les phrases
--      (table phrase_drafts, éditables avant validation finale)
--
-- Quand un sous-thème est "validated", ses phrase_drafts sont copiés
-- dans la table phrases du projet (avec position incrémentale).
-- =============================================

-- =====================
-- SUBTOPICS — plan de découpage du dataset
-- =====================
CREATE TABLE public.subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_count INT NOT NULL CHECK (target_count > 0 AND target_count <= 1000),
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'validated', 'failed')),
  generated_count INT NOT NULL DEFAULT 0,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  UNIQUE (project_id, position)
);

CREATE INDEX idx_subtopics_project ON public.subtopics(project_id);
CREATE INDEX idx_subtopics_status ON public.subtopics(status);

-- =====================
-- PHRASE_DRAFTS — phrases en attente de validation par le client
-- =====================
CREATE TABLE public.phrase_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INT NOT NULL,
  content TEXT NOT NULL,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phrase_drafts_subtopic ON public.phrase_drafts(subtopic_id);
CREATE INDEX idx_phrase_drafts_project ON public.phrase_drafts(project_id);

-- =====================
-- RLS — accès restreint au owner du projet (ou admin)
-- =====================
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subtopics_owner_or_admin"
  ON public.subtopics
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = subtopics.project_id
        AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = subtopics.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "phrase_drafts_owner_or_admin"
  ON public.phrase_drafts
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = phrase_drafts.project_id
        AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = phrase_drafts.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- =====================
-- FONCTION : valider un sous-thème = copier ses drafts vers phrases
-- =====================
-- SECURITY DEFINER pour bypass RLS pendant la copie atomique.
-- Vérifie l'ownership avant d'agir.
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
BEGIN
  -- Récupère projet + owner + statut du sous-thème
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

  IF v_status <> 'ready' THEN
    RAISE EXCEPTION 'subtopic_not_ready' USING ERRCODE = '22023';
  END IF;

  -- Position max actuelle dans phrases du projet
  SELECT COALESCE(MAX(position), 0) INTO v_max_position
    FROM public.phrases WHERE project_id = v_project_id;

  -- Copie incrémentale
  WITH inserted AS (
    INSERT INTO public.phrases (project_id, position, content)
    SELECT
      v_project_id,
      v_max_position + ROW_NUMBER() OVER (ORDER BY position),
      content
    FROM public.phrase_drafts
    WHERE subtopic_id = p_subtopic_id
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  -- Marque le sous-thème comme validé
  UPDATE public.subtopics
    SET status = 'validated', validated_at = now()
    WHERE id = p_subtopic_id;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_subtopic(UUID) TO authenticated;

-- =====================
-- FONCTION : compter le total de phrases visées sur un projet
-- (utile pour quotas + progression UI)
-- =====================
CREATE OR REPLACE FUNCTION public.project_target_total(p_project_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(target_count), 0)::INT
    FROM public.subtopics
    WHERE project_id = p_project_id;
$$;

GRANT EXECUTE ON FUNCTION public.project_target_total(UUID) TO authenticated;
