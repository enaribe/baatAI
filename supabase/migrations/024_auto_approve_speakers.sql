-- =============================================
-- Baat-IA — Migration 024 : suppression du système de validation
-- =============================================
-- Tous les locuteurs sont automatiquement approuvés à l'inscription.
-- - Default approved sur verification_status
-- - Migration des speakers pending existants en approved
-- - Suppression du trigger anti-self-approval (021) qui n'a plus de sens
-- =============================================

-- 1. Default approved (au lieu de pending)
ALTER TABLE public.speaker_profiles
  ALTER COLUMN verification_status SET DEFAULT 'approved';

-- 2. Approuver tous les speakers en pending
UPDATE public.speaker_profiles
SET verification_status = 'approved'
WHERE verification_status = 'pending';

-- 3. Supprimer le trigger qui empêchait l'auto-approval
DROP TRIGGER IF EXISTS speaker_profile_prevent_self_approval ON public.speaker_profiles;
DROP FUNCTION IF EXISTS public.prevent_speaker_self_approval();
