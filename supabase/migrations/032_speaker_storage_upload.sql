-- =============================================
-- Baat-IA — Migration 032 : upload storage pour les locuteurs authentifiés
-- =============================================
-- Les policies actuelles (004, 005, 012) n'autorisent que auth.role() = 'anon'
-- à uploader/lire/modifier dans audio-raw. Les locuteurs authentifiés via
-- le nouveau flow /speaker/record/:sessionId sont en rôle 'authenticated'
-- → 403 "new row violates row-level security policy".
--
-- On ajoute des policies qui autorisent les speakers authentifiés à uploader
-- dans audio-raw (TUS nécessite INSERT + SELECT + UPDATE).
-- =============================================

CREATE POLICY "Speakers upload audio-raw"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-raw'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Speakers select own audio-raw"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-raw'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Speakers update own audio-raw"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio-raw'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid()
    )
  );
