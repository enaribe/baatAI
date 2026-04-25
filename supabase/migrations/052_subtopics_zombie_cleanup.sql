-- =============================================
-- Daandé — Migration 052 : cleanup des subtopics "generating" zombies
-- =============================================
-- Fix audit I6.
--
-- Problème : si une edge function generate-subtopic-phrases timeout
-- (limite Supabase = 150 s), le subtopic reste à status='generating'
-- indéfiniment. L'edge function refuse de relancer (ligne 390) car le
-- statut est generating. Le client est coincé.
--
-- Solution : pg_cron toutes les 5 min repasse en 'failed' tout subtopic
-- en generating depuis > 10 min (largement supérieur au timeout 2.5 min).
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fonction : marque comme failed les subtopics zombies
CREATE OR REPLACE FUNCTION public.cleanup_subtopics_zombies()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INT;
BEGIN
  WITH updated AS (
    UPDATE public.subtopics
       SET status = 'failed',
           failed_reason = 'Timeout : la génération a été interrompue, réessayez'
     WHERE status = 'generating'
       AND created_at < now() - interval '10 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM updated;

  IF v_updated > 0 THEN
    RAISE NOTICE 'cleanup_subtopics_zombies: % subtopics marqués failed', v_updated;
  END IF;

  RETURN v_updated;
END;
$$;

-- Programme le cron toutes les 5 minutes (idempotent : on supprime d'abord)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_subtopics_zombies') THEN
    PERFORM cron.unschedule('cleanup_subtopics_zombies');
  END IF;

  PERFORM cron.schedule(
    'cleanup_subtopics_zombies',
    '*/5 * * * *',  -- toutes les 5 minutes
    $cron$ SELECT public.cleanup_subtopics_zombies(); $cron$
  );
END $$;

COMMENT ON FUNCTION public.cleanup_subtopics_zombies IS
  'Repasse en failed les subtopics restés generating > 10 minutes (timeout edge function). Lancé par pg_cron toutes les 5 min.';
