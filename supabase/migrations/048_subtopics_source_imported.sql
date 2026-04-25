-- =============================================
-- Daandé — Migration 048 : source 'imported' pour subtopics
-- =============================================
-- Permet de distinguer les sous-thèmes créés via upload de document
-- (texte FR uploadé puis traduit) des sous-thèmes IA pure (theme).
-- =============================================

ALTER TABLE public.subtopics
  DROP CONSTRAINT IF EXISTS subtopics_source_check;

ALTER TABLE public.subtopics
  ADD CONSTRAINT subtopics_source_check
  CHECK (source IN ('ai', 'manual', 'imported'));
