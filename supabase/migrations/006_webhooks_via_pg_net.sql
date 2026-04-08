-- =============================================
-- Baat-IA — Migration 005 : Webhooks via pg_net
-- Remplace les Database Webhooks du dashboard
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================
-- Webhook : process-segment (sur INSERT recordings)
-- =====================
CREATE OR REPLACE FUNCTION public.notify_process_segment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://62f8-41-82-59-70.ngrok-free.app/api/process-segment',
    body := jsonb_build_object(
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
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook process-segment failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_recording_inserted
  AFTER INSERT ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.notify_process_segment();

-- =====================
-- Webhook : generate-export (sur INSERT exports)
-- =====================
CREATE OR REPLACE FUNCTION public.notify_generate_export()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://62f8-41-82-59-70.ngrok-free.app/api/generate-export',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'exports',
      'record', jsonb_build_object(
        'id', NEW.id,
        'project_id', NEW.project_id,
        'format', NEW.format,
        'filters_applied', NEW.filters_applied,
        'status', NEW.status
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook generate-export failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_export_inserted
  AFTER INSERT ON public.exports
  FOR EACH ROW EXECUTE FUNCTION public.notify_generate_export();
