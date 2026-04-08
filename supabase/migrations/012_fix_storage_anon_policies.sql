-- =============================================
-- Fix: TUS resumable upload nécessite SELECT et UPDATE en plus de INSERT
-- pour les locuteurs anonymes sur audio-raw
-- =============================================

-- Permet aux anon de lire leurs propres uploads (nécessaire pour TUS resume)
CREATE POLICY "Anon select audio-raw for TUS" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-raw' AND
    auth.role() = 'anon'
  );

-- Permet aux anon de mettre à jour leurs uploads (nécessaire pour TUS chunks)
CREATE POLICY "Anon update audio-raw for TUS" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'audio-raw' AND
    auth.role() = 'anon'
  );
