-- =============================================
-- Baat-IA — Migration 002 : Row Level Security
-- =============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage projects" ON public.projects
  FOR ALL USING (auth.uid() = owner_id);

-- PHRASES
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project owners read phrases" ON public.phrases
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Project owners insert phrases" ON public.phrases
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Project owners delete phrases" ON public.phrases
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- RECORDING SESSIONS
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sessions" ON public.recording_sessions
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- RECORDINGS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read recordings" ON public.recordings
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
-- Note : les INSERT sur recordings sont faits par le service_role
-- (via Edge Function pour les locuteurs anonymes)

-- EXPORTS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage exports" ON public.exports
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
