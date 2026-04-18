-- Colonnes DNSMOS v2 — scores qualité perceptuelle (DNSMOS P.835)
-- Calculés par le serveur Python, NULL jusqu'à l'intégration DNSMOS.

ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS mos_signal  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mos_noise   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mos_overall DOUBLE PRECISION;

COMMENT ON COLUMN public.recordings.mos_signal  IS 'DNSMOS P.835 — qualité du signal vocal (1-5).';
COMMENT ON COLUMN public.recordings.mos_noise   IS 'DNSMOS P.835 — niveau de bruit de fond (1-5).';
COMMENT ON COLUMN public.recordings.mos_overall IS 'DNSMOS P.835 — qualité perceptuelle globale (1-5).';
