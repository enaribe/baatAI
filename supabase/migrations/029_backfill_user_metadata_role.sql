-- =============================================
-- Baat-IA — Migration 029 : synchroniser raw_user_meta_data.role
-- =============================================
-- Le frontend bascule vers une lecture directe du role depuis
-- auth.users.raw_user_meta_data.role (dispo synchrone via la session).
-- Pour tous les comptes existants, on copie profiles.role → metadata.role
-- afin qu'ils voient immédiatement leur bon role sans requête DB.
-- =============================================

UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id
  AND (
    u.raw_user_meta_data->>'role' IS NULL
    OR u.raw_user_meta_data->>'role' <> p.role
  );
