-- =============================================
-- Migration 020 : correction récursion RLS
-- Toutes les subqueries cross-tables passent par des fonctions SECURITY DEFINER
-- =============================================

-- =====================
-- Supprimer toutes les policies problématiques
-- =====================
DROP POLICY IF EXISTS "Speakers see accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Speakers see public active projects" ON public.projects;
DROP POLICY IF EXISTS "Invited speakers see private projects" ON public.projects;
DROP POLICY IF EXISTS "Speakers read phrases of accessible projects" ON public.phrases;
DROP POLICY IF EXISTS "Project owner manages invitations" ON public.project_invitations;

-- Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS public.speaker_can_see_project(uuid);
DROP FUNCTION IF EXISTS public.current_user_is_speaker();
DROP FUNCTION IF EXISTS public.current_user_has_invitation(uuid);

-- =====================
-- Fonctions SECURITY DEFINER (bypass RLS dans les subqueries)
-- =====================

-- Est-ce que l'utilisateur courant est un locuteur approuvé ?
CREATE OR REPLACE FUNCTION public.is_approved_speaker()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.speaker_profiles
    WHERE id = auth.uid()
      AND verification_status = 'approved'
  );
$$;

-- Est-ce que le locuteur courant a une invitation pour ce projet ?
CREATE OR REPLACE FUNCTION public.has_invitation_for_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_invitations
    WHERE project_id = p_project_id
      AND speaker_id = auth.uid()
      AND status IN ('pending', 'accepted')
  );
$$;

-- Est-ce que l'utilisateur courant est propriétaire de ce projet ?
CREATE OR REPLACE FUNCTION public.owns_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND owner_id = auth.uid()
  );
$$;

-- =====================
-- Policies PROJECTS
-- =====================

-- Locuteurs : projets publics actifs + projets avec invitation
CREATE POLICY "Speakers see accessible projects"
  ON public.projects FOR SELECT
  USING (
    public.is_approved_speaker()
    AND (
      (is_public = TRUE AND status = 'active')
      OR public.has_invitation_for_project(id)
    )
  );

-- =====================
-- Policies PHRASES
-- =====================

-- Locuteurs : phrases des projets accessibles
CREATE POLICY "Speakers read phrases of accessible projects"
  ON public.phrases FOR SELECT
  USING (
    public.is_approved_speaker()
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = phrases.project_id
          AND p.is_public = TRUE
          AND p.status = 'active'
      )
      OR public.has_invitation_for_project(project_id)
    )
  );

-- =====================
-- Policies PROJECT_INVITATIONS
-- =====================

-- Propriétaire du projet gère ses invitations (via fonction, sans subquery direct)
CREATE POLICY "Project owner manages invitations"
  ON public.project_invitations FOR ALL
  USING (public.owns_project(project_id));
