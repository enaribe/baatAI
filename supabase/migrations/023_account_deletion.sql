-- =============================================
-- Baat-IA — Migration 023 : suppression de compte
-- =============================================
-- Stratégie :
-- - Speaker : anonymisation (recordings gardés pour les datasets clients)
-- - Client  : hard delete de auth.users (cascade) si pas de projets actifs
-- - Admin   : non supprimable via self-service
-- =============================================

-- Colonne deleted_at pour soft-tracking (utile si on veut exclure des queries)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.speaker_profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================
-- Fonction d'anonymisation d'un locuteur
-- =====================
-- Remplace les données personnelles par des valeurs neutres.
-- Les recordings, sessions et wallet_transactions restent pour l'intégrité des datasets.
-- Appelée uniquement via service_role (Edge Function).

CREATE OR REPLACE FUNCTION public.anonymize_speaker(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Anonymiser profiles (nom / organisation)
  UPDATE public.profiles
  SET
    full_name = 'Locuteur supprimé',
    organization = NULL,
    deleted_at = now()
  WHERE id = p_user_id;

  -- Anonymiser speaker_profiles (coordonnées, bio, avatar)
  UPDATE public.speaker_profiles
  SET
    phone = NULL,
    avatar_url = NULL,
    bio = NULL,
    date_of_birth = NULL,
    city = NULL,
    is_available = FALSE,
    verification_status = 'rejected',
    deleted_at = now()
  WHERE id = p_user_id;

  -- Marquer les invitations pending comme cancelled
  UPDATE public.project_invitations
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = p_user_id
  WHERE speaker_id = p_user_id AND status = 'pending';
END;
$$;

-- =====================
-- Fonction de check : client a-t-il des projets actifs ?
-- =====================
CREATE OR REPLACE FUNCTION public.client_has_active_projects(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE owner_id = p_user_id
    AND status NOT IN ('archived', 'completed');
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.anonymize_speaker(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.client_has_active_projects(UUID) TO service_role;
