-- =============================================
-- Baat-IA — Migration 038 : lifecycle automatique du bucket audio-raw
-- =============================================
-- Supabase Storage n'a pas de lifecycle policy native (contrairement à S3).
-- On utilise pg_cron pour supprimer chaque jour les WebM bruts dont :
--   - le recording associé a `processing_status = 'completed'` (donc le WAV
--     traité existe dans `audio-processed`, le brut n'est plus utile)
--   - l'âge > 30 jours
--
-- Justification du délai 30 jours :
--   - Permet de re-traiter manuellement si le pipeline a planté
--   - Permet l'investigation de qualité sur les segments rejetés
--   - À ajuster selon les coûts Storage observés
--
-- Sécurité : on ne touche PAS aux recordings dont :
--   - processing_status != 'completed' (en attente, en erreur, etc.)
--   - is_valid = false (pour audit qualité)
--   - raw_storage_path est NULL (déjà nettoyé)
-- =============================================

-- Active pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fonction de cleanup : supprime les fichiers du bucket + nullifie raw_storage_path
CREATE OR REPLACE FUNCTION public.cleanup_old_raw_audio()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  v_count INT := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT id, raw_storage_path
    FROM public.recordings
    WHERE processing_status = 'completed'
      AND is_valid = TRUE
      AND raw_storage_path IS NOT NULL
      AND created_at < (now() - INTERVAL '30 days')
    LIMIT 1000  -- batch pour éviter de saturer
  LOOP
    -- Supprime du bucket Storage (via la table storage.objects)
    DELETE FROM storage.objects
      WHERE bucket_id = 'audio-raw'
        AND name = v_record.raw_storage_path;

    -- Nullifie la colonne pour marquer le nettoyage
    UPDATE public.recordings
      SET raw_storage_path = NULL
      WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_raw_audio() IS
  'Supprime les WebM bruts du bucket audio-raw pour les recordings completed/valid > 30 jours. Lancé par pg_cron une fois par jour.';

-- Programme le job : tous les jours à 3h UTC (4h Dakar en hiver, 5h en été)
-- Vérifie qu'il n'est pas déjà programmé (idempotence)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_audio_raw_daily') THEN
    PERFORM cron.schedule(
      'cleanup_audio_raw_daily',
      '0 3 * * *',
      $cron$SELECT public.cleanup_old_raw_audio();$cron$
    );
  END IF;
END $$;
