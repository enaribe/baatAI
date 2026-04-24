-- =============================================
-- Daandé — Migration 043 : logs des emails transactionnels
-- =============================================
-- But :
--   - Tracer chaque envoi (debug, support, anti-doublon)
--   - Permettre un retry manuel en cas d'échec
--   - Statistiques d'envoi côté admin
-- =============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Destinataire
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Contenu
  template TEXT NOT NULL,
    -- 'request_received' | 'request_approved' | 'request_rejected' | 'request_waitlist'
    -- | 'account_suspended' | 'account_revoked'
  subject TEXT NOT NULL,
  -- Contexte
  related_entity_type TEXT,  -- 'access_request' | 'profile'
  related_entity_id UUID,
  payload JSONB,             -- variables du template (nom, raison, etc.)
  -- Status d'envoi
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  resend_message_id TEXT,    -- ID retourné par l'API Resend
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created ON public.email_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_related ON public.email_logs(related_entity_type, related_entity_id);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on email_logs" ON public.email_logs;
CREATE POLICY "Admin full access on email_logs"
  ON public.email_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- L'INSERT/UPDATE se fait via Edge Functions avec service_role (bypass RLS).
