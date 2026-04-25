-- =============================================
-- Daandé — Migration 049 : durcissement sécurité subtopics + phrase_drafts
-- =============================================
-- Fixes audit C1 + C2 + C5.
--
-- Problèmes corrigés :
--   C1 — validate_subtopic ne vérifiait pas le quota projet (5000 phrases),
--        permettant à un client de bypass via UPDATE direct ou validations
--        en chaîne.
--
--   C2 — Policy phrase_drafts FOR ALL → un client pouvait INSERT en masse
--        depuis le navigateur via REST, contournant les edge functions et
--        leur logique de quota/rate-limit/Gemini.
--
--   C5 — Policy subtopics FOR ALL → un client pouvait UPDATE target_count
--        à 99999, puis demander à generate-subtopic-phrases de boucler
--        et cramer le quota Gemini.
--
-- Stratégie globale : le service_role (edge functions) est la seule porte
-- d'entrée pour INSERT/UPDATE des champs sensibles. Le client peut lire
-- (SELECT), supprimer ses drafts (DELETE), et éditer le contenu d'une
-- phrase (UPDATE de phrase_drafts.content uniquement).
-- =============================================


-- =====================
-- C1 : validate_subtopic vérifie quota projet
-- =====================
-- On garde la signature existante et on ajoute le check juste après le
-- check de status. Limite hardcodée à 5000 (cohérent avec edge functions).
-- À factoriser plus tard si on veut un quota par tier/abonnement.

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

  -- Garde-fou quota : empêche que la validation pousse le projet au-delà
  -- de la limite, peu importe comment les drafts ont été créés.
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

  UPDATE public.subtopics
    SET status = 'validated', validated_at = now()
    WHERE id = p_subtopic_id;

  RETURN v_inserted;
END;
$$;


-- =====================
-- C2 : RLS phrase_drafts — séparer les opérations
-- =====================
-- SELECT : owner du projet ou admin
-- UPDATE : pareil (pour pouvoir éditer content/edited inline)
-- DELETE : pareil (pour supprimer une mauvaise traduction)
-- INSERT : aucune policy → seul service_role peut INSERT
--          (edge functions generate-subtopic-phrases, import-document-translate)

DROP POLICY IF EXISTS "phrase_drafts_owner_or_admin" ON public.phrase_drafts;

CREATE POLICY "phrase_drafts_select" ON public.phrase_drafts
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = phrase_drafts.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "phrase_drafts_update" ON public.phrase_drafts
  FOR UPDATE
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

CREATE POLICY "phrase_drafts_delete" ON public.phrase_drafts
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = phrase_drafts.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Pas de policy INSERT pour le rôle authenticated.
-- Seul service_role bypass RLS et peut INSERT (depuis edge functions).


-- =====================
-- C2 bis : RLS subtopics — même découpage
-- =====================
-- Le client peut :
--   - SELECT : lire ses sous-thèmes
--   - DELETE : supprimer un sous-thème entier (cascade les drafts)
--   - UPDATE : éditer title/description (mais pas target_count/status/source)
--              → contrôlé par le trigger C5 ci-dessous
-- Pas d'INSERT direct → forcer le passage par fonction SQL ou edge function.

DROP POLICY IF EXISTS "subtopics_owner_or_admin" ON public.subtopics;

CREATE POLICY "subtopics_select" ON public.subtopics
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = subtopics.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "subtopics_update" ON public.subtopics
  FOR UPDATE
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

CREATE POLICY "subtopics_delete" ON public.subtopics
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = subtopics.project_id
        AND projects.owner_id = auth.uid()
    )
  );


-- =====================
-- C5 : Trigger protect_subtopics_columns
-- =====================
-- Empêche le client de modifier target_count, status, source, generated_count,
-- failed_reason, generated_at, validated_at via UPDATE direct.
-- Seul service_role (edge functions) ou les RPC SECURITY DEFINER (validate /
-- unvalidate) peuvent toucher à ces colonnes.
--
-- Détection du caller : on regarde le current_user/role. Le service_role
-- bypasse RLS et a current_user = 'service_role'. Le user authenticated a
-- current_user = 'authenticated'. Les RPC SECURITY DEFINER s'exécutent
-- avec les droits du owner de la fonction (souvent postgres) → traitées
-- comme service_role.

CREATE OR REPLACE FUNCTION public.protect_subtopics_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Bypass pour service_role et postgres (RPC SECURITY DEFINER)
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Pour le rôle authenticated, certaines colonnes sont read-only
  IF NEW.target_count IS DISTINCT FROM OLD.target_count THEN
    RAISE EXCEPTION 'target_count est en lecture seule (modifiable uniquement via les edge functions de génération)'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status est en lecture seule (géré par les edge functions et les RPC validate/unvalidate)'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.source IS DISTINCT FROM OLD.source THEN
    RAISE EXCEPTION 'source est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.generated_count IS DISTINCT FROM OLD.generated_count THEN
    RAISE EXCEPTION 'generated_count est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.failed_reason IS DISTINCT FROM OLD.failed_reason THEN
    RAISE EXCEPTION 'failed_reason est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.generated_at IS DISTINCT FROM OLD.generated_at THEN
    RAISE EXCEPTION 'generated_at est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
    RAISE EXCEPTION 'validated_at est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.position IS DISTINCT FROM OLD.position THEN
    RAISE EXCEPTION 'position est en lecture seule'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subtopics_columns ON public.subtopics;

CREATE TRIGGER protect_subtopics_columns
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subtopics_columns();


-- =====================
-- C2 ter : RPC pour ajouter un sous-thème manuel (remplace l'INSERT direct)
-- =====================
-- Le client appelle add_manual_subtopic(project, title, desc, count) depuis
-- le navigateur. La RPC valide tout, calcule la position, vérifie le quota,
-- et INSERT en SECURITY DEFINER (bypass des restrictions RLS).

CREATE OR REPLACE FUNCTION public.add_manual_subtopic(
  p_project_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_target_count INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
  v_existing_total INT;
  v_quota CONSTANT INT := 5000;
  v_next_position INT;
  v_new_id UUID;
BEGIN
  -- Validation basique
  IF p_title IS NULL OR length(trim(p_title)) < 3 OR length(trim(p_title)) > 200 THEN
    RAISE EXCEPTION 'title_invalid: le titre doit faire entre 3 et 200 caractères' USING ERRCODE = '22023';
  END IF;

  IF p_target_count < 50 OR p_target_count > 500 THEN
    RAISE EXCEPTION 'target_count_invalid: doit être entre 50 et 500' USING ERRCODE = '22023';
  END IF;

  -- Ownership
  SELECT owner_id INTO v_owner_id
    FROM public.projects WHERE id = p_project_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = '42704';
  END IF;

  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Quota cumulé
  SELECT COALESCE(SUM(target_count), 0) INTO v_existing_total
    FROM public.subtopics WHERE project_id = p_project_id;

  IF v_existing_total + p_target_count > v_quota THEN
    RAISE EXCEPTION
      'project_quota_exceeded: % phrases planifiées sur %', v_existing_total, v_quota
      USING ERRCODE = 'P0001';
  END IF;

  -- Position suivante (atomique grâce à la transaction implicite)
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
    FROM public.subtopics WHERE project_id = p_project_id;

  INSERT INTO public.subtopics (
    project_id, position, title, description, target_count, source, status
  ) VALUES (
    p_project_id,
    v_next_position,
    trim(p_title),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_target_count,
    'manual',
    'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_manual_subtopic(UUID, TEXT, TEXT, INT) TO authenticated;
