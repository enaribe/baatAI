-- =============================================
-- Baat-IA — Migration 005 : Politique upload anonyme
-- Les locuteurs (anon) peuvent uploader dans audio-raw
-- =============================================

-- Permet aux locuteurs anonymes d'uploader des fichiers audio
-- Le path doit suivre le format : {project_id}/{session_id}/{phrase_id}.webm
CREATE POLICY "Locuteurs anonymes upload audio-raw" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-raw' AND
    auth.role() = 'anon'
  );
