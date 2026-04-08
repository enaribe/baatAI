-- =============================================
-- Baat-IA — Migration 003 : Storage Buckets
-- =============================================

-- Créer les buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audio-raw', 'audio-raw', false),
  ('audio-processed', 'audio-processed', false),
  ('exports', 'exports', false);

-- Politique : clients authentifiés peuvent lire les audios traités
CREATE POLICY "Clients read processed audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-processed' AND
    auth.uid() IS NOT NULL
  );

-- Politique : clients authentifiés peuvent lire les exports
CREATE POLICY "Clients read exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND
    auth.uid() IS NOT NULL
  );
