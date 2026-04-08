-- Mise à jour URL ngrok

CREATE OR REPLACE FUNCTION public.notify_process_segment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://1e8e-41-82-59-70.ngrok-free.app/api/process-segment',
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
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 79d4466b689ddbece8966d6a91b825d2fdd7ee1444c287e7b5bc658dec192fa1'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook process-segment failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_generate_export()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://1e8e-41-82-59-70.ngrok-free.app/api/generate-export',
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
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 79d4466b689ddbece8966d6a91b825d2fdd7ee1444c287e7b5bc658dec192fa1'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook generate-export failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
