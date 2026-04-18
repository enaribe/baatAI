-- =============================================
-- Baat-IA — Migration 018 : RLS pour comptes locuteurs
-- =============================================

-- =====================
-- SPEAKER_PROFILES
-- =====================
ALTER TABLE public.speaker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Speaker reads own profile"
  ON public.speaker_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Speaker inserts own profile"
  ON public.speaker_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Speaker updates own profile"
  ON public.speaker_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Clients et admins voient les profils approuvés (pour le matching)
-- Colonnes sensibles (wallet, phone) filtrées côté application
CREATE POLICY "Authenticated users browse approved speakers"
  ON public.speaker_profiles FOR SELECT
  USING (
    verification_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('client', 'admin')
    )
  );

CREATE POLICY "Admin manages all speakers"
  ON public.speaker_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================
-- PROJECTS : accès locuteur
-- =====================

-- Projets publics visibles par les locuteurs approuvés
CREATE POLICY "Speakers see public active projects"
  ON public.projects FOR SELECT
  USING (
    is_public = TRUE
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

-- Projets privés visibles si invitation pending ou acceptée
CREATE POLICY "Invited speakers see private projects"
  ON public.projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM public.project_invitations
      WHERE speaker_id = auth.uid()
        AND status IN ('pending', 'accepted')
    )
  );

-- =====================
-- PHRASES : accès locuteur
-- =====================

-- Un locuteur lit les phrases des projets publics actifs ou sur invitation
CREATE POLICY "Speakers read phrases of accessible projects"
  ON public.phrases FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE is_public = TRUE AND status = 'active'
    )
    OR project_id IN (
      SELECT project_id FROM public.project_invitations
      WHERE speaker_id = auth.uid() AND status = 'accepted'
    )
  );

-- =====================
-- PROJECT_INVITATIONS
-- =====================
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Speaker reads own invitations"
  ON public.project_invitations FOR SELECT
  USING (speaker_id = auth.uid());

-- Le locuteur peut uniquement modifier le statut (accepter/décliner)
CREATE POLICY "Speaker responds to own invitations"
  ON public.project_invitations FOR UPDATE
  USING (speaker_id = auth.uid())
  WITH CHECK (speaker_id = auth.uid());

-- Le propriétaire du projet gère ses invitations
CREATE POLICY "Project owner manages invitations"
  ON public.project_invitations FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admin manages all invitations"
  ON public.project_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================
-- RECORDING_SESSIONS : accès locuteur
-- =====================

-- Un locuteur voit ses propres sessions
CREATE POLICY "Speaker reads own sessions"
  ON public.recording_sessions FOR SELECT
  USING (speaker_id = auth.uid());

-- =====================
-- RECORDINGS : accès locuteur
-- =====================

-- Un locuteur lit ses propres recordings (via ses sessions)
CREATE POLICY "Speaker reads own recordings"
  ON public.recordings FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.recording_sessions
      WHERE speaker_id = auth.uid()
    )
  );

-- =====================
-- WALLET_TRANSACTIONS
-- =====================
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour le locuteur (INSERT/UPDATE via service_role ou trigger)
CREATE POLICY "Speaker reads own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (speaker_id = auth.uid());

CREATE POLICY "Admin reads all transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================
-- WITHDRAWALS
-- =====================
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Speaker manages own withdrawals"
  ON public.withdrawals FOR ALL
  USING (speaker_id = auth.uid());

CREATE POLICY "Admin manages all withdrawals"
  ON public.withdrawals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
