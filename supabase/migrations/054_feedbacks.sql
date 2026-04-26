-- =============================================
-- Daandé — Migration 054 : table feedbacks utilisateurs
-- =============================================
-- Permet aux clients et locuteurs de remonter des bugs, suggestions ou
-- avis depuis n'importe quelle page de l'app via un bouton flottant.
-- Les admins consultent depuis /admin/feedbacks.
-- =============================================

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,           -- snapshot pour ne pas perdre l'info si compte supprimé
  user_role TEXT,            -- 'client' / 'speaker' / 'admin' au moment du feedback
  category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'praise', 'other')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 2000),
  page_url TEXT,             -- où le user était quand il a soumis
  user_agent TEXT,           -- navigateur, utile pour reproduire bugs
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedbacks_status ON public.feedbacks(status, created_at DESC);
CREATE INDEX idx_feedbacks_user ON public.feedbacks(user_id, created_at DESC);
CREATE INDEX idx_feedbacks_category ON public.feedbacks(category);


-- =====================
-- RLS
-- =====================
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- INSERT : tout user authentifié peut créer un feedback (pour soi)
CREATE POLICY "feedbacks_insert_self" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT : un user voit ses propres feedbacks, un admin voit tout
CREATE POLICY "feedbacks_select_self_or_admin" ON public.feedbacks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- UPDATE : seul l'admin peut changer le statut / ajouter des notes
CREATE POLICY "feedbacks_update_admin" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE : seul l'admin
CREATE POLICY "feedbacks_delete_admin" ON public.feedbacks
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- =====================
-- RPC : submit_feedback (snapshot user metadata)
-- =====================
-- Le client appelle cette RPC plutôt qu'INSERT direct pour qu'on capture
-- automatiquement l'email + rôle au moment du feedback (utile si le compte
-- est supprimé plus tard).
CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_category TEXT,
  p_message TEXT,
  p_page_url TEXT,
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_role TEXT;
  v_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.feedbacks (
    user_id, user_email, user_role, category, message, page_url, user_agent
  ) VALUES (
    v_user_id, v_email, v_role, p_category, p_message,
    NULLIF(trim(COALESCE(p_page_url, '')), ''),
    NULLIF(trim(COALESCE(p_user_agent, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, TEXT) TO authenticated;
