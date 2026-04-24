-- =============================================
-- Daandé — Reset complet avant lancement beta privée
-- =============================================
-- /!\ DESTRUCTIF : supprime TOUS les utilisateurs, projets, recordings, etc.
-- À exécuter UNE FOIS dans le SQL Editor Supabase Dashboard, juste avant
-- d'appliquer la migration 041_beta_access_control.sql.
--
-- Workflow recommandé :
--   1. (optionnel) Sauvegarde via Dashboard → Database → Backups
--   2. Lancer ce script dans SQL Editor
--   3. Lancer reset_storage.sh pour vider les buckets Storage
--   4. npx supabase db push (applique 041 et bootstrap admin)
--
-- ⚠️⚠️⚠️ IMPORTANT — ÉVITER UN BUG VÉCU ⚠️⚠️⚠️
-- Si tu rejoues ce script APRÈS avoir déjà appliqué la migration 041 :
--   → la table allowed_emails est vidée
--   → ton compte admin n'est plus whitelisté
--   → impossible de te reconnecter ou créer un nouveau compte
--
-- DANS CE CAS, exécute ce SQL juste après pour ré-injecter ton bootstrap admin :
--
--   INSERT INTO public.allowed_emails (email, role, source, approved_at)
--   VALUES ('papabdoulaye16@gmail.com', 'admin', 'bootstrap', now())
--   ON CONFLICT (email) DO UPDATE
--     SET role = 'admin', source = 'bootstrap',
--         used_at = NULL, signed_up_user_id = NULL;
--
-- (Remplace l'email par celui de ton admin réel.)
-- =============================================

-- Étape 1 : statistiques AVANT reset (pour vérifier)
DO $$
DECLARE
  v_users INT;
  v_profiles INT;
  v_projects INT;
  v_recordings INT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM auth.users;
  SELECT COUNT(*) INTO v_profiles FROM public.profiles;
  SELECT COUNT(*) INTO v_projects FROM public.projects;
  SELECT COUNT(*) INTO v_recordings FROM public.recordings;
  RAISE NOTICE '=== AVANT RESET ===';
  RAISE NOTICE 'auth.users : %', v_users;
  RAISE NOTICE 'profiles   : %', v_profiles;
  RAISE NOTICE 'projects   : %', v_projects;
  RAISE NOTICE 'recordings : %', v_recordings;
END $$;

-- Étape 2 : tables applicatives (CASCADE gère les FK)
TRUNCATE TABLE
  public.exports,
  public.peer_validations,
  public.recordings,
  public.recording_sessions,
  public.phrases,
  public.project_invitations,
  public.client_favorite_speakers,
  public.notifications,
  public.wallet_transactions,
  public.withdrawals,
  public.projects,
  public.speaker_profiles,
  public.profiles
RESTART IDENTITY CASCADE;

-- Étape 3 : auth.users (cascade vers profiles via FK ON DELETE CASCADE)
DELETE FROM auth.users;

-- Étape 4 : sessions actives Supabase Auth (déconnecte tout le monde)
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Étape 5 : si access_requests / allowed_emails existent déjà (rejouer le script)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='access_requests') THEN
    EXECUTE 'TRUNCATE TABLE public.access_requests RESTART IDENTITY CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='allowed_emails') THEN
    EXECUTE 'TRUNCATE TABLE public.allowed_emails CASCADE';
  END IF;
END $$;

-- Étape 6 : statistiques APRÈS reset
DO $$
DECLARE
  v_users INT;
  v_profiles INT;
  v_projects INT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM auth.users;
  SELECT COUNT(*) INTO v_profiles FROM public.profiles;
  SELECT COUNT(*) INTO v_projects FROM public.projects;
  RAISE NOTICE '=== APRÈS RESET ===';
  RAISE NOTICE 'auth.users : %', v_users;
  RAISE NOTICE 'profiles   : %', v_profiles;
  RAISE NOTICE 'projects   : %', v_projects;
  RAISE NOTICE 'Reset terminé. Tu peux maintenant créer ton compte admin.';
END $$;
