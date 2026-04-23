-- =============================================
-- Baat-IA — Migration 040 : retry automatique des recordings stuck
-- =============================================
-- Le webhook pg_net est fire-and-forget : si Python est down au moment
-- du POST, l'event est perdu. Cette migration ajoute :
--   1. Colonne retry_count sur recordings (max 2 retries)
--   2. RPC public.retry_recording(uuid) qui rejoue le webhook
--   3. RPC public.delete_recording(uuid) pour permettre la suppression côté locuteur
--   4. Cron toutes les 10 min qui retry les recordings stuck > 5 min (max 2x)
-- =============================================

-- 1. Colonne retry_count
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_recordings_pending_retry
  ON public.recordings(uploaded_at)
  WHERE processing_status = 'pending';

-- 2. Fonction interne : déclenche manuellement le webhook process-segment
--    (réutilise la signature HMAC de la migration 037)
CREATE OR REPLACE FUNCTION public._trigger_process_segment(p_recording_id UUID)
RETURNS VOID AS $$
DECLARE
  v_record RECORD;
  v_body TEXT;
  v_ts BIGINT;
  v_signature TEXT;
BEGIN
  SELECT id, session_id, project_id, phrase_id, raw_storage_path, processing_status
    INTO v_record
    FROM public.recordings
    WHERE id = p_recording_id;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Recording introuvable : %', p_recording_id;
  END IF;

  v_ts := EXTRACT(EPOCH FROM now())::BIGINT;
  v_body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'recordings',
    'record', jsonb_build_object(
      'id', v_record.id,
      'session_id', v_record.session_id,
      'project_id', v_record.project_id,
      'phrase_id', v_record.phrase_id,
      'raw_storage_path', v_record.raw_storage_path,
      'processing_status', v_record.processing_status
    )
  )::text;
  v_signature := public._sign_webhook(v_body, v_ts);

  PERFORM net.http_post(
    url := 'https://web-production-7f832.up.railway.app/api/process-segment',
    body := v_body::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Timestamp', v_ts::text,
      'X-Webhook-Signature', v_signature
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC publique : retry manuel d'un recording (pour le locuteur ou admin)
--    Vérifie l'auth + permissions via RLS-style check.
CREATE OR REPLACE FUNCTION public.retry_recording(p_recording_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_speaker_id UUID;
  v_status TEXT;
  v_retry_count INT;
BEGIN
  -- Vérifier que l'utilisateur est propriétaire de la session
  SELECT rs.speaker_id, r.processing_status, r.retry_count
    INTO v_speaker_id, v_status, v_retry_count
    FROM public.recordings r
    JOIN public.recording_sessions rs ON rs.id = r.session_id
    WHERE r.id = p_recording_id;

  IF v_speaker_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Recording introuvable');
  END IF;

  IF v_speaker_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Accès refusé');
  END IF;

  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('error', 'Déjà traité');
  END IF;

  -- Incrémente retry_count et déclenche le webhook
  UPDATE public.recordings
    SET retry_count = retry_count + 1,
        processing_status = 'pending'
    WHERE id = p_recording_id;

  PERFORM public._trigger_process_segment(p_recording_id);

  RETURN jsonb_build_object('success', true, 'retry_count', v_retry_count + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC publique : suppression d'un recording par son propriétaire
--    Supprime aussi le fichier storage associé.
CREATE OR REPLACE FUNCTION public.delete_recording(p_recording_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_speaker_id UUID;
  v_session_id UUID;
  v_raw_path TEXT;
  v_processed_path TEXT;
BEGIN
  SELECT rs.speaker_id, r.session_id, r.raw_storage_path, r.processed_storage_path
    INTO v_speaker_id, v_session_id, v_raw_path, v_processed_path
    FROM public.recordings r
    JOIN public.recording_sessions rs ON rs.id = r.session_id
    WHERE r.id = p_recording_id;

  IF v_speaker_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Recording introuvable');
  END IF;

  IF v_speaker_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Accès refusé');
  END IF;

  -- Supprime les fichiers Storage associés
  IF v_raw_path IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'audio-raw' AND name = v_raw_path;
  END IF;
  IF v_processed_path IS NOT NULL THEN
    DELETE FROM storage.objects WHERE bucket_id = 'audio-processed' AND name = v_processed_path;
  END IF;

  -- Supprime le recording
  DELETE FROM public.recordings WHERE id = p_recording_id;

  -- Décrémente le compteur de la session si pertinent
  UPDATE public.recording_sessions
    SET total_recorded = GREATEST(0, total_recorded - 1)
    WHERE id = v_session_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cron : retry auto des recordings stuck (max 2 retries)
--    Toutes les 10 min, prend les recordings pending depuis > 5 min
--    avec retry_count < 2 et déclenche le webhook.
CREATE OR REPLACE FUNCTION public.auto_retry_stuck_recordings()
RETURNS INT AS $$
DECLARE
  v_record RECORD;
  v_count INT := 0;
BEGIN
  FOR v_record IN
    SELECT id FROM public.recordings
    WHERE processing_status = 'pending'
      AND retry_count < 2
      AND uploaded_at < (now() - INTERVAL '5 minutes')
    ORDER BY uploaded_at
    LIMIT 50  -- batch protection
  LOOP
    BEGIN
      UPDATE public.recordings
        SET retry_count = retry_count + 1
        WHERE id = v_record.id;

      PERFORM public._trigger_process_segment(v_record.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-retry failed for recording %: %', v_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule : toutes les 10 min
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_retry_stuck_recordings') THEN
    PERFORM cron.schedule(
      'auto_retry_stuck_recordings',
      '*/10 * * * *',
      $cron$SELECT public.auto_retry_stuck_recordings();$cron$
    );
  END IF;
END $$;

-- Permissions : autoriser les utilisateurs authentifiés à appeler les RPC publics
GRANT EXECUTE ON FUNCTION public.retry_recording(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_recording(UUID) TO authenticated;

COMMENT ON FUNCTION public.retry_recording(UUID) IS
  'Permet à un locuteur de relancer manuellement le traitement d''un recording stuck.';
COMMENT ON FUNCTION public.delete_recording(UUID) IS
  'Permet à un locuteur de supprimer son recording (et les fichiers Storage associés).';
COMMENT ON FUNCTION public.auto_retry_stuck_recordings() IS
  'Cron 10 min : retry auto des recordings pending > 5 min (max 2 retries).';
