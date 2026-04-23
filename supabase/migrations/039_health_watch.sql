-- =============================================
-- Baat-IA — Migration 039 : health watch via pg_cron + Discord
-- =============================================
-- Surveille en continu l'état du pipeline et envoie une alerte Discord
-- si quelque chose est coincé. Toutes les 15 min pour les alertes
-- critiques, et un digest quotidien à 9h Dakar (10h UTC) pour les infos.
--
-- SETUP (à faire UNE FOIS via SQL Editor) :
--   SELECT vault.create_secret(
--     'https://discord.com/api/webhooks/.../...',
--     'discord_alerts_webhook'
--   );
--
-- Seuils :
--   - recordings stuck pending > 30 min      → 🚨
--   - exports stuck generating > 1h          → 🚨
--   - withdrawals pending > 24h              → ⚠️
--   - taux recordings invalides > 50% / 24h  → ⚠️
--   - daily digest 9h Dakar                  → ℹ️
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper : récupère le webhook Discord depuis le Vault
CREATE OR REPLACE FUNCTION public._discord_webhook_url()
RETURNS TEXT AS $$
  SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'discord_alerts_webhook'
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper : envoie un message Discord
-- Couleurs Discord (entiers décimaux) :
--   rouge crit   = 15158332 (#E74C3C)
--   orange warn  = 15844367 (#F1C40F)
--   bleu info    = 3447003  (#3498DB)
--   vert ok      = 3066993  (#2ECC71)
CREATE OR REPLACE FUNCTION public._send_discord_alert(
  title TEXT,
  description TEXT,
  color INT DEFAULT 3447003
)
RETURNS VOID AS $$
DECLARE
  v_url TEXT;
  v_payload JSONB;
BEGIN
  v_url := public._discord_webhook_url();
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'Discord webhook non configuré dans le Vault';
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'username', 'Daandé Health',
    'embeds', jsonb_build_array(
      jsonb_build_object(
        'title', title,
        'description', description,
        'color', color,
        'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
  );

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Discord alert failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- CHECKS CRITIQUES (toutes les 15 min)
-- =====================
CREATE OR REPLACE FUNCTION public.health_check_critical()
RETURNS VOID AS $$
DECLARE
  v_count INT;
  v_details TEXT;
BEGIN
  -- 1. Recordings stuck en pending > 30 min
  SELECT COUNT(*) INTO v_count
    FROM public.recordings
    WHERE processing_status = 'pending'
      AND uploaded_at < (now() - INTERVAL '30 minutes');

  SELECT string_agg(id::text, ', ') INTO v_details
    FROM (
      SELECT id FROM public.recordings
      WHERE processing_status = 'pending'
        AND uploaded_at < (now() - INTERVAL '30 minutes')
      ORDER BY uploaded_at
      LIMIT 5
    ) sub;

  IF v_count > 0 THEN
    PERFORM public._send_discord_alert(
      format('🚨 %s recordings bloqués en pending', v_count),
      format(
        'Depuis > 30 min. Cause probable : serveur Python down ou queue saturée.' || E'\n' ||
        '**Premiers IDs** : %s' || E'\n' ||
        '**Action** : check logs Railway, redéploie si nécessaire.',
        COALESCE(v_details, 'n/a')
      ),
      15158332  -- rouge
    );
  END IF;

  -- 2. Exports stuck en generating > 1h
  SELECT COUNT(*) INTO v_count
    FROM public.exports
    WHERE status = 'generating'
      AND created_at < (now() - INTERVAL '1 hour');

  IF v_count > 0 THEN
    PERFORM public._send_discord_alert(
      format('🚨 %s exports bloqués en generating', v_count),
      'Depuis > 1h. Le serveur Python n''a pas terminé la génération du ZIP. Check Railway logs.',
      15158332
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- CHECKS WARNING (toutes les heures)
-- =====================
CREATE OR REPLACE FUNCTION public.health_check_warnings()
RETURNS VOID AS $$
DECLARE
  v_count INT;
  v_total INT;
  v_invalid INT;
  v_ratio NUMERIC;
BEGIN
  -- 3. Withdrawals pending > 24h sans traitement
  SELECT COUNT(*) INTO v_count
    FROM public.withdrawals
    WHERE status = 'pending'
      AND created_at < (now() - INTERVAL '24 hours');

  IF v_count > 0 THEN
    PERFORM public._send_discord_alert(
      format('⚠️ %s retraits en attente depuis > 24h', v_count),
      format(
        'Des locuteurs attendent leur paiement Wave/Orange Money depuis plus d''un jour.' || E'\n' ||
        '**Action** : ouvre /admin/withdrawals et traite les demandes.'
      ),
      15844367  -- orange
    );
  END IF;

  -- 4. Taux de recordings invalides sur 24h glissantes
  SELECT
    COUNT(*) FILTER (WHERE processing_status = 'completed'),
    COUNT(*) FILTER (WHERE processing_status = 'completed' AND is_valid = FALSE)
    INTO v_total, v_invalid
    FROM public.recordings
    WHERE uploaded_at > (now() - INTERVAL '24 hours');

  IF v_total >= 20 THEN  -- ne déclenche que si volume significatif
    v_ratio := (v_invalid::NUMERIC / v_total::NUMERIC) * 100;
    IF v_ratio > 50 THEN
      PERFORM public._send_discord_alert(
        format('⚠️ %s%% de recordings invalides sur 24h', round(v_ratio, 1)),
        format(
          '%s rejetés sur %s traités. Cause possible : seuils QC trop stricts, micro défaillant, bruit ambiant des locuteurs.' || E'\n' ||
          '**Action** : check les rejection_reasons les plus fréquentes.',
          v_invalid, v_total
        ),
        15844367
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- DAILY DIGEST (1× par jour à 9h Dakar = 9h UTC)
-- =====================
CREATE OR REPLACE FUNCTION public.health_daily_digest()
RETURNS VOID AS $$
DECLARE
  v_recordings_24h INT;
  v_validated_24h INT;
  v_new_speakers_24h INT;
  v_active_projects INT;
  v_total_speakers INT;
  v_pending_withdrawals INT;
  v_pending_amount BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_recordings_24h
    FROM public.recordings WHERE uploaded_at > now() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_validated_24h
    FROM public.recordings
    WHERE uploaded_at > now() - INTERVAL '24 hours' AND is_valid = TRUE;

  SELECT COUNT(*) INTO v_new_speakers_24h
    FROM public.speaker_profiles WHERE created_at > now() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_active_projects
    FROM public.projects WHERE status = 'active';

  SELECT COUNT(*) INTO v_total_speakers
    FROM public.speaker_profiles WHERE is_available = TRUE;

  SELECT COUNT(*), COALESCE(SUM(amount_fcfa), 0)
    INTO v_pending_withdrawals, v_pending_amount
    FROM public.withdrawals WHERE status = 'pending';

  PERFORM public._send_discord_alert(
    'ℹ️ Digest quotidien — Daandé',
    format(
      '**Dernières 24h**' || E'\n' ||
      '• Recordings reçus : %s' || E'\n' ||
      '• Recordings validés : %s' || E'\n' ||
      '• Nouveaux locuteurs : %s' || E'\n\n' ||
      '**État global**' || E'\n' ||
      '• Projets actifs : %s' || E'\n' ||
      '• Locuteurs disponibles : %s' || E'\n' ||
      '• Retraits en attente : %s (%s FCFA)',
      v_recordings_24h, v_validated_24h, v_new_speakers_24h,
      v_active_projects, v_total_speakers,
      v_pending_withdrawals, v_pending_amount
    ),
    3447003  -- bleu
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- SCHEDULING
-- =====================
DO $$
BEGIN
  -- Critical : toutes les 15 min
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health_check_critical') THEN
    PERFORM cron.schedule(
      'health_check_critical',
      '*/15 * * * *',
      $cron$SELECT public.health_check_critical();$cron$
    );
  END IF;

  -- Warnings : toutes les heures
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health_check_warnings') THEN
    PERFORM cron.schedule(
      'health_check_warnings',
      '0 * * * *',
      $cron$SELECT public.health_check_warnings();$cron$
    );
  END IF;

  -- Daily digest : 9h UTC = 9h Dakar (UTC+0)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health_daily_digest') THEN
    PERFORM cron.schedule(
      'health_daily_digest',
      '0 9 * * *',
      $cron$SELECT public.health_daily_digest();$cron$
    );
  END IF;
END $$;

COMMENT ON FUNCTION public.health_check_critical() IS
  'Checks 🚨 toutes les 15 min : recordings/exports stuck. Alerte Discord si problème.';
COMMENT ON FUNCTION public.health_check_warnings() IS
  'Checks ⚠️ toutes les heures : withdrawals en retard, taux d''invalidité élevé.';
COMMENT ON FUNCTION public.health_daily_digest() IS
  'Digest ℹ️ quotidien à 9h Dakar : compteurs d''activité 24h + état global.';
