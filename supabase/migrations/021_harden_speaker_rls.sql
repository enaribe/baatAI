-- =============================================
-- Baat-IA — Migration 021 : durcissement RLS speaker_profiles
-- =============================================
-- Objectifs :
-- 1. INSERT sur speaker_profiles exige profiles.role = 'speaker'
--    (empêche un client de créer un speaker_profile)
-- 2. UPDATE : un speaker ne peut PAS modifier lui-même son verification_status
--    (seul admin via la policy existante, ou trigger, peut approuver)
-- =============================================

-- Remplacer la policy INSERT
DROP POLICY IF EXISTS "Speaker inserts own profile" ON public.speaker_profiles;

CREATE POLICY "Speaker inserts own profile"
  ON public.speaker_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'speaker'
    )
  );

-- Remplacer la policy UPDATE : interdire la modification du verification_status par le speaker lui-même
-- (on garde le speaker comme owner de son profil pour les champs non critiques)
DROP POLICY IF EXISTS "Speaker updates own profile" ON public.speaker_profiles;

CREATE POLICY "Speaker updates own profile"
  ON public.speaker_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger pour empêcher un speaker de changer son verification_status
CREATE OR REPLACE FUNCTION public.prevent_speaker_self_approval()
RETURNS trigger AS $$
BEGIN
  -- Si la session courante est admin (via admin policy) ou service_role, on laisse passer
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- Service role (bypass auth) : auth.uid() est NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sinon (speaker lui-même), verification_status ne peut pas changer
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Un locuteur ne peut pas modifier son propre statut de vérification';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS speaker_profile_prevent_self_approval ON public.speaker_profiles;
CREATE TRIGGER speaker_profile_prevent_self_approval
  BEFORE UPDATE ON public.speaker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_speaker_self_approval();
