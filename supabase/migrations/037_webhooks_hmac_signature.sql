-- =============================================
-- Baat-IA — Migration 037 : signature HMAC sur les webhooks
-- =============================================
-- Remplace l'ancien Bearer token (committé en clair dans la migration 007)
-- par une signature HMAC-SHA256 + timestamp anti-replay.
--
-- Le secret est lu depuis le Vault Supabase via `vault.secrets`.
-- Pour configurer (à exécuter UNE FOIS manuellement, hors migration) :
--   SELECT vault.create_secret('<un_long_secret_random>', 'webhook_hmac_secret');
--
-- Côté Python, le secret correspond à la variable d'env WEBHOOK_HMAC_SECRET.
-- Le serveur accepte EN PARALLÈLE l'ancien Bearer token pendant la transition,
-- ce qui permet de déployer cette migration et le serveur Python dans
-- n'importe quel ordre sans downtime du pipeline audio.
-- =============================================

-- Helper : récupère le secret HMAC depuis le Vault
CREATE OR REPLACE FUNCTION public._webhook_hmac_secret()
RETURNS TEXT AS $$
  SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'webhook_hmac_secret'
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper : signe un payload avec HMAC-SHA256
-- Format de signature : hex(hmac_sha256(secret, timestamp + '.' + body))
CREATE OR REPLACE FUNCTION public._sign_webhook(body_text TEXT, ts BIGINT)
RETURNS TEXT AS $$
  SELECT encode(
    extensions.hmac(
      (ts::text || '.' || body_text)::bytea,
      public._webhook_hmac_secret()::bytea,
      'sha256'
    ),
    'hex'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================
-- WEBHOOK : process-segment (INSERT recordings)
-- =====================
CREATE OR REPLACE FUNCTION public.notify_process_segment()
RETURNS TRIGGER AS $$
DECLARE
  v_body TEXT;
  v_ts BIGINT;
  v_signature TEXT;
BEGIN
  v_ts := EXTRACT(EPOCH FROM now())::BIGINT;
  v_body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'recordings',
    'record', jsonb_build_object(
      'id', NEW.id,
      'session_id', NEW.session_id,
      'project_id', NEW.project_id,
      'phrase_id', NEW.phrase_id,
      'raw_storage_path', NEW.raw_storage_path,
      'processing_status', NEW.processing_status
    )
  )::text;
  v_signature := public._sign_webhook(v_body, v_ts);

  PERFORM net.http_post(
    url := 'https://web-production-7f832.up.railway.app/api/process-segment',
    body := v_body::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Timestamp', v_ts::text,
      'X-Webhook-Signature', v_signature
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook process-segment failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- WEBHOOK : generate-export (INSERT exports)
-- =====================
CREATE OR REPLACE FUNCTION public.notify_generate_export()
RETURNS TRIGGER AS $$
DECLARE
  v_body TEXT;
  v_ts BIGINT;
  v_signature TEXT;
BEGIN
  v_ts := EXTRACT(EPOCH FROM now())::BIGINT;
  v_body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'exports',
    'record', jsonb_build_object(
      'id', NEW.id,
      'project_id', NEW.project_id,
      'format', NEW.format,
      'filters_applied', NEW.filters_applied,
      'status', NEW.status
    )
  )::text;
  v_signature := public._sign_webhook(v_body, v_ts);

  PERFORM net.http_post(
    url := 'https://web-production-7f832.up.railway.app/api/generate-export',
    body := v_body::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Timestamp', v_ts::text,
      'X-Webhook-Signature', v_signature
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook generate-export failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_process_segment() IS
  'Trigger ON INSERT recordings : POST signé HMAC vers le serveur Python /api/process-segment.';
COMMENT ON FUNCTION public.notify_generate_export() IS
  'Trigger ON INSERT exports : POST signé HMAC vers le serveur Python /api/generate-export.';
