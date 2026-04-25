-- =============================================
-- Daandé — Migration 051 : rate-limit persistant en table Postgres
-- =============================================
-- Fix audit C4.
--
-- Le rate-limit in-memory de _shared/rate-limit.ts était bypassable car les
-- Edge Functions Deno tournent sur plusieurs workers/régions, chacun avec
-- sa propre Map en mémoire. Un user pouvait multiplier ses appels Gemini
-- par le nombre de workers qu'il touchait → coût Gemini direct.
--
-- Solution : table dédiée, vérification atomique côté DB.
-- L'edge function appelle check_rate_limit(key, max, window_sec) qui :
--   - INSERT un nouveau token avec timestamp now()
--   - Compte les tokens du même bucket dans la fenêtre
--   - Retourne true si la limite est dépassée
--
-- Cleanup : un trigger ou job nettoie les rows > 24h.
-- =============================================


CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  user_id UUID,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (bucket, ts DESC);

-- RLS : table interne, pas de lecture côté client
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Aucune policy → seul service_role accède (bypass RLS)


-- =====================
-- Fonction RPC : check_rate_limit
-- =====================
-- Atomique : INSERT puis COUNT dans la même transaction.
-- Retourne true si la requête doit être REJETÉE (limite dépassée).
-- L'insertion est faite AVANT le count, donc si limite=5 et qu'on a déjà 5
-- requêtes dans la fenêtre, la 6e est insérée puis le count retourne 6 > 5.
-- C'est OK : on rejette et le row excédentaire reste (consommera moins
-- d'espace que la complexité d'un check-then-insert).

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket TEXT,
  p_max INT,
  p_window_sec INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.rate_limits (bucket, user_id, ts)
  VALUES (p_bucket, auth.uid(), now());

  SELECT count(*) INTO v_count
    FROM public.rate_limits
   WHERE bucket = p_bucket
     AND ts > (now() - (p_window_sec || ' seconds')::interval);

  -- Cleanup opportuniste : 1% de chance de supprimer les vieux rows
  -- pour ce bucket (rows > 24h). Évite un pg_cron dédié.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
     WHERE ts < now() - interval '24 hours';
  END IF;

  RETURN v_count > p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated, service_role;
