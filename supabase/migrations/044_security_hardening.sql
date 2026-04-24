-- =============================================
-- Daandé — Migration 044 : durcissement sécurité audit phase 1-4
-- =============================================
-- Fixes #1 et #2 du rapport d'audit :
--   1) Fonction is_admin() pour casser la récursion RLS potentielle
--      (les policies sur access_requests/allowed_emails/email_logs faisaient
--      un EXISTS sur profiles, ce qui peut récurser si profiles a une RLS
--      qui référence d'autres tables)
--   2) Try/catch dans handle_new_user pour gérer proprement les race
--      conditions (double signup rapide → unique_violation sur profiles)
-- =============================================

-- =====================
-- 1. Fonction is_admin() — source unique pour les policies admin
-- =====================
-- SECURITY DEFINER : bypass les RLS sur profiles → plus de récursion possible
-- STABLE : Postgres peut cacher le résultat dans la même requête
-- search_path explicite : protège contre les schema injection attacks

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================
-- 2. Refactor RLS pour utiliser is_admin()
-- =====================

-- access_requests
DROP POLICY IF EXISTS "Admin full access on access_requests" ON public.access_requests;
CREATE POLICY "Admin full access on access_requests"
  ON public.access_requests
  FOR ALL
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- allowed_emails
DROP POLICY IF EXISTS "Admin full access on allowed_emails" ON public.allowed_emails;
CREATE POLICY "Admin full access on allowed_emails"
  ON public.allowed_emails
  FOR ALL
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- email_logs
DROP POLICY IF EXISTS "Admin full access on email_logs" ON public.email_logs;
CREATE POLICY "Admin full access on email_logs"
  ON public.email_logs
  FOR ALL
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- =====================
-- 3. Refactor admin_list_users / admin_user_detail pour utiliser is_admin()
-- =====================
-- Cohérence : une seule source de vérité pour le check admin

DROP FUNCTION IF EXISTS public.admin_list_users(TEXT, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_role        TEXT DEFAULT NULL,
  p_status      TEXT DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_limit       INT  DEFAULT 100,
  p_offset      INT  DEFAULT 0
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access_denied: admin requis' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', u.email,
    'organization', p.organization,
    'role', p.role,
    'status', p.status,
    'suspended_reason', p.suspended_reason,
    'suspended_at', p.suspended_at,
    'created_at', p.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'projects_count', COALESCE(pj.total, 0),
    'active_projects_count', COALESCE(pj.active, 0),
    'speaker_city', sp.city,
    'speaker_languages', sp.languages,
    'recordings_count', COALESCE(rec.total, 0),
    'validated_recordings_count', COALESCE(rec.validated, 0),
    'wallet_balance_fcfa', COALESCE(sp.wallet_balance_fcfa, 0),
    'pending_withdrawal', COALESCE(wd.has_pending, FALSE)
  )
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE pp.status = 'active') AS active
    FROM public.projects pp
    WHERE pp.owner_id = p.id
  ) pj ON p.role IN ('client', 'admin')
  LEFT JOIN public.speaker_profiles sp ON sp.id = p.id AND p.role = 'speaker'
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE r.is_valid = TRUE) AS validated
    FROM public.recordings r
    JOIN public.recording_sessions s ON s.id = r.session_id
    WHERE s.speaker_id = p.id
  ) rec ON p.role = 'speaker'
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM public.withdrawals w
      WHERE w.speaker_id = p.id AND w.status IN ('pending', 'approved')
    ) AS has_pending
  ) wd ON p.role = 'speaker'
  WHERE
    (p_role IS NULL OR p.role = p_role)
    AND (p_status IS NULL OR p.status = p_status)
    AND (
      p_search IS NULL
      OR p.full_name ILIKE '%' || p_search || '%'
      OR u.email ILIKE '%' || p_search || '%'
      OR p.organization ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, TEXT, TEXT, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access_denied: admin requis' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', u.email,
    'organization', p.organization,
    'role', p.role,
    'status', p.status,
    'suspended_reason', p.suspended_reason,
    'suspended_at', p.suspended_at,
    'suspended_by_name', sp_admin.full_name,
    'created_at', p.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed_at', u.email_confirmed_at,
    'speaker', CASE WHEN p.role = 'speaker' THEN jsonb_build_object(
      'phone', sp.phone,
      'city', sp.city,
      'gender', sp.gender,
      'date_of_birth', sp.date_of_birth,
      'languages', sp.languages,
      'dialects', sp.dialects,
      'bio', sp.bio,
      'is_certified', sp.is_certified,
      'reliability_score', sp.reliability_score,
      'wallet_balance_fcfa', sp.wallet_balance_fcfa,
      'total_validated', sp.total_validated,
      'sample_storage_path', sp.sample_storage_path
    ) ELSE NULL END,
    'stats', jsonb_build_object(
      'projects_total', COALESCE((
        SELECT COUNT(*) FROM public.projects pp WHERE pp.owner_id = p.id
      ), 0),
      'projects_active', COALESCE((
        SELECT COUNT(*) FROM public.projects pp WHERE pp.owner_id = p.id AND pp.status = 'active'
      ), 0),
      'projects_completed', COALESCE((
        SELECT COUNT(*) FROM public.projects pp WHERE pp.owner_id = p.id AND pp.status = 'completed'
      ), 0),
      'recordings_total', COALESCE((
        SELECT COUNT(*) FROM public.recordings r
        JOIN public.recording_sessions s ON s.id = r.session_id
        WHERE s.speaker_id = p.id
      ), 0),
      'recordings_valid', COALESCE((
        SELECT COUNT(*) FROM public.recordings r
        JOIN public.recording_sessions s ON s.id = r.session_id
        WHERE s.speaker_id = p.id AND r.is_valid = TRUE
      ), 0),
      'recordings_invalid', COALESCE((
        SELECT COUNT(*) FROM public.recordings r
        JOIN public.recording_sessions s ON s.id = r.session_id
        WHERE s.speaker_id = p.id AND r.is_valid = FALSE
      ), 0),
      'invitations_received', COALESCE((
        SELECT COUNT(*) FROM public.project_invitations pi WHERE pi.speaker_id = p.id
      ), 0),
      'invitations_accepted', COALESCE((
        SELECT COUNT(*) FROM public.project_invitations pi WHERE pi.speaker_id = p.id AND pi.status = 'accepted'
      ), 0),
      'withdrawals_total', COALESCE((
        SELECT COUNT(*) FROM public.withdrawals w WHERE w.speaker_id = p.id
      ), 0),
      'withdrawals_pending', COALESCE((
        SELECT COUNT(*) FROM public.withdrawals w WHERE w.speaker_id = p.id AND w.status IN ('pending', 'approved')
      ), 0),
      'total_paid_fcfa', COALESCE((
        SELECT SUM(w.amount_fcfa) FROM public.withdrawals w WHERE w.speaker_id = p.id AND w.status = 'paid'
      ), 0)
    )
  )
  INTO v_result
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.speaker_profiles sp ON sp.id = p.id
  LEFT JOIN public.profiles sp_admin ON sp_admin.id = p.suspended_by
  WHERE p.id = p_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_detail(UUID) TO authenticated;

-- =====================
-- 4. Hardening handle_new_user : try/catch sur l'INSERT profile
-- =====================
-- Cas couvert : double signup rapide qui violerait la PK profiles.id
-- Si l'INSERT échoue, on ne marque PAS la whitelist comme used (cohérence)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_allowed_role TEXT;
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Sécurité : limiter aux rôles connus
  IF v_role NOT IN ('client', 'speaker', 'admin') THEN
    v_role := 'client';
  END IF;

  -- Vérifier la whitelist : email doit être présent + non utilisé + non expiré
  SELECT role INTO v_allowed_role
  FROM public.allowed_emails
  WHERE email = v_email
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF v_allowed_role IS NULL THEN
    RAISE EXCEPTION 'access_denied: cet email n''est pas autorisé. Demandez un accès sur /request-access.'
      USING ERRCODE = '42501';
  END IF;

  -- Le rôle effectif est celui de la whitelist (sécurité : empêche escalade)
  v_role := v_allowed_role;

  -- Créer le profil — try/catch pour gérer les race conditions
  BEGIN
    INSERT INTO public.profiles (id, full_name, organization, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'organization',
      v_role
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Le profil existe déjà (race condition double signup) :
      -- on remonte une erreur explicite plutôt que de laisser une exception cryptique
      RAISE EXCEPTION 'profile_already_exists: ce compte est en cours de création.'
        USING ERRCODE = '23505';
  END;

  -- Marquer la whitelist comme utilisée (uniquement si l'INSERT a réussi)
  UPDATE public.allowed_emails
  SET used_at = now(),
      signed_up_user_id = NEW.id
  WHERE email = v_email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
