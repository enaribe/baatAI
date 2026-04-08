-- =============================================
-- Baat-IA — Migration 004 : Realtime + Helpers
-- =============================================

-- Activer Realtime sur la table recordings pour le suivi en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;

-- Activer Realtime sur recording_sessions pour voir les mises à jour de progression
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_sessions;

-- Activer Realtime sur exports pour le suivi du statut de génération
ALTER PUBLICATION supabase_realtime ADD TABLE public.exports;

-- =====================
-- Trigger auto-update de updated_at sur projects
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- Politique Storage : permettre l'upload anonyme dans audio-raw
-- (les locuteurs uploadent via TUS sans auth Supabase)
-- =====================
CREATE POLICY "Anonymous upload to audio-raw" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-raw'
  );

-- Politique : permettre au propriétaire de lire les audios bruts
CREATE POLICY "Clients read raw audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-raw' AND
    auth.uid() IS NOT NULL
  );
