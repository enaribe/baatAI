-- =============================================
-- Daandé — Migration 042 : RPC admin pour la gestion des utilisateurs
-- =============================================
-- Phase 3 : RPC admin_list_users (agrégation profile + stats par rôle)
-- + RPC admin_user_detail (fiche complète d'un user)
-- =============================================

-- =====================
-- 1. RPC admin_list_users
-- =====================
-- Retourne tous les profils (clients + speakers) avec stats agrégées.
-- Note : on n'utilise pas RETURNS TABLE pour éviter les conflits de noms
-- avec les colonnes de profiles/auth.users. On retourne du JSONB.

-- Drop d'abord (Postgres refuse de changer le return type via CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.admin_list_users(TEXT, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_role        TEXT DEFAULT NULL,  -- 'client' | 'speaker' | 'admin' | NULL = tous
  p_status      TEXT DEFAULT NULL,  -- 'active' | 'suspended' | 'revoked' | NULL = tous
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
  -- Garde admin (qualifie tout pour éviter ambiguïtés)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p_admin
    WHERE p_admin.id = auth.uid()
      AND p_admin.role = 'admin'
      AND p_admin.status = 'active'
  ) THEN
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
  -- Stats projets (client / admin)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE pp.status = 'active') AS active
    FROM public.projects pp
    WHERE pp.owner_id = p.id
  ) pj ON p.role IN ('client', 'admin')
  -- Speaker profile
  LEFT JOIN public.speaker_profiles sp ON sp.id = p.id AND p.role = 'speaker'
  -- Stats recordings (speaker)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE r.is_valid = TRUE) AS validated
    FROM public.recordings r
    JOIN public.recording_sessions s ON s.id = r.session_id
    WHERE s.speaker_id = p.id
  ) rec ON p.role = 'speaker'
  -- Pending withdrawal
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

-- =====================
-- 2. RPC admin_user_detail
-- =====================

CREATE OR REPLACE FUNCTION public.admin_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Garde admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p_admin
    WHERE p_admin.id = auth.uid()
      AND p_admin.role = 'admin'
      AND p_admin.status = 'active'
  ) THEN
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
