-- =============================================
-- Daandé — Migration 041 : contrôle d'accès beta privée
-- =============================================
-- Phase 1 : whitelist d'emails + demandes d'accès + statut compte
-- + promotion de papabdoulaye16@gmail.com en admin
-- =============================================

-- =====================
-- 1. TABLE access_requests
-- =====================
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  intended_role TEXT NOT NULL CHECK (intended_role IN ('client', 'speaker')),

  -- Champs spécifiques client
  organization TEXT,
  use_case TEXT,
  expected_volume TEXT,
  target_languages TEXT[],

  -- Champs spécifiques speaker
  speaker_languages TEXT[],
  speaker_city TEXT,
  speaker_age_range TEXT,
  speaker_gender TEXT,
  speaker_motivation TEXT,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist')),
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status_created
  ON public.access_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_role_status
  ON public.access_requests(intended_role, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email
  ON public.access_requests(LOWER(email));

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- RLS : seuls les admins peuvent lire/modifier
DROP POLICY IF EXISTS "Admin full access on access_requests" ON public.access_requests;
CREATE POLICY "Admin full access on access_requests"
  ON public.access_requests
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

-- L'INSERT se fait via Edge Function avec service_role, pas besoin de policy public

-- =====================
-- 2. TABLE allowed_emails (whitelist)
-- =====================
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('client', 'speaker', 'admin')),
  source TEXT NOT NULL CHECK (source IN ('request', 'manual', 'invitation', 'bootstrap')),
  request_id UUID REFERENCES public.access_requests(id) ON DELETE SET NULL,
  invitation_token TEXT UNIQUE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  signed_up_user_id UUID REFERENCES public.profiles(id)
);

-- Email toujours en lowercase pour comparaison
CREATE OR REPLACE FUNCTION public.lowercase_allowed_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS allowed_emails_lowercase ON public.allowed_emails;
CREATE TRIGGER allowed_emails_lowercase
  BEFORE INSERT OR UPDATE ON public.allowed_emails
  FOR EACH ROW EXECUTE FUNCTION public.lowercase_allowed_email();

CREATE INDEX IF NOT EXISTS idx_allowed_emails_unused
  ON public.allowed_emails(used_at) WHERE used_at IS NULL;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on allowed_emails" ON public.allowed_emails;
CREATE POLICY "Admin full access on allowed_emails"
  ON public.allowed_emails
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

-- =====================
-- 3. profiles : statut du compte
-- =====================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id);

-- Mettre à jour la contrainte CHECK pour autoriser 'speaker' (déjà fait dans 026 mais on s'assure)
DO $$
BEGIN
  -- Drop la contrainte existante si présente avec un nom standard
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('client', 'speaker', 'admin'));
EXCEPTION WHEN OTHERS THEN
  -- Ignore si la contrainte n'existe pas avec ce nom
  NULL;
END $$;

-- =====================
-- 4. Trigger handle_new_user : check whitelist
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_allowed_role TEXT;
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Sécurité : limiter aux rôles connus
  IF v_role NOT IN ('client', 'speaker', 'admin') THEN
    v_role := 'client';
  END IF;

  -- Vérifier la whitelist : email doit être présent + role correspond
  SELECT role INTO v_allowed_role
  FROM public.allowed_emails
  WHERE email = v_email
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF v_allowed_role IS NULL THEN
    RAISE EXCEPTION 'access_denied: cet email n''est pas autorisé. Demandez un accès sur /request-access.'
      USING ERRCODE = '42501';
  END IF;

  -- Le rôle effectif est celui de la whitelist (sécurité : empêche escalade)
  v_role := v_allowed_role;

  -- Créer le profil
  INSERT INTO public.profiles (id, full_name, organization, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'organization',
    v_role
  );

  -- Marquer la whitelist comme utilisée
  UPDATE public.allowed_emails
  SET used_at = now(),
      signed_up_user_id = NEW.id
  WHERE email = v_email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 5. RPC publique : vérifier si un email est whitelisté (pour UX)
-- =====================
CREATE OR REPLACE FUNCTION public.is_email_whitelisted(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE email = LOWER(TRIM(p_email))
      AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_email_whitelisted(TEXT) TO anon, authenticated;

-- =====================
-- 6. Bootstrap : promouvoir papabdoulaye16@gmail.com en admin + whitelist
-- =====================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1) Si le compte existe déjà dans auth.users, on le passe en admin
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = 'papabdoulaye16@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Mettre à jour le profil (créer si absent)
    INSERT INTO public.profiles (id, full_name, role, status)
    VALUES (v_user_id, 'Papa Abdoulaye', 'admin', 'active')
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin',
          status = 'active';

    -- Mettre à jour le metadata Supabase Auth pour cohérence
    UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    WHERE id = v_user_id;

    -- Whitelist (même si compte existe, pour cohérence)
    INSERT INTO public.allowed_emails (email, role, source, approved_at, used_at, signed_up_user_id)
    VALUES ('papabdoulaye16@gmail.com', 'admin', 'bootstrap', now(), now(), v_user_id)
    ON CONFLICT (email) DO UPDATE
      SET role = 'admin',
          source = 'bootstrap',
          used_at = now(),
          signed_up_user_id = EXCLUDED.signed_up_user_id;

    RAISE NOTICE 'Compte admin existant promu : %', v_user_id;
  ELSE
    -- Compte n'existe pas : juste whitelist en admin
    INSERT INTO public.allowed_emails (email, role, source, approved_at)
    VALUES ('papabdoulaye16@gmail.com', 'admin', 'bootstrap', now())
    ON CONFLICT (email) DO UPDATE
      SET role = 'admin',
          source = 'bootstrap';

    RAISE NOTICE 'Email whitelisté en admin (compte à créer) : papabdoulaye16@gmail.com';
  END IF;
END $$;

-- =====================
-- 7. Whitelister rétroactivement TOUS les comptes existants
-- =====================
-- But : ne pas casser l'accès des utilisateurs déjà inscrits.
-- On ajoute leur email à allowed_emails avec leur rôle actuel,
-- en marquant used_at = created_at du profil (déjà utilisé).
INSERT INTO public.allowed_emails (
  email,
  role,
  source,
  approved_at,
  used_at,
  signed_up_user_id
)
SELECT
  LOWER(u.email),
  COALESCE(p.role, 'client'),
  'bootstrap',
  COALESCE(p.created_at, u.created_at, now()),
  COALESCE(p.created_at, u.created_at, now()),
  u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Reporting (visible dans les logs de migration)
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.allowed_emails WHERE source = 'bootstrap';
  RAISE NOTICE 'Bootstrap whitelist : % comptes existants whitelistés', v_count;
END $$;
