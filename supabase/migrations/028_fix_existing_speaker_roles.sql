-- =============================================
-- Baat-IA — Migration 028 : rattraper les speakers bloqués en role='client'
-- =============================================
-- Avant la migration 026, certains utilisateurs inscrits via le flow speaker
-- ont vu leur UPDATE role='speaker' échouer (race condition) et sont restés
-- en role='client'. On les retrouve facilement : ils ont un speaker_profile
-- mais leur profile.role n'est pas 'speaker'.
-- =============================================

UPDATE public.profiles p
SET role = 'speaker'
WHERE p.role <> 'speaker'
  AND EXISTS (
    SELECT 1 FROM public.speaker_profiles sp
    WHERE sp.id = p.id
  );
