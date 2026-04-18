-- Persistance des métriques QC supplémentaires calculées par le serveur
-- mais non stockées jusqu'ici : énergie vocale (RMS) et décalage DC.

ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS speech_energy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dc_offset DOUBLE PRECISION;

COMMENT ON COLUMN public.recordings.speech_energy IS
  'RMS global du signal (détecte micro ouvert sans parole).';
COMMENT ON COLUMN public.recordings.dc_offset IS
  'Valeur absolue du décalage DC (matériel défectueux si > 0.05).';
