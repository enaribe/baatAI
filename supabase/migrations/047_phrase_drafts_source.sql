-- =============================================
-- Daandé — Migration 047 : source FR pour phrase_drafts
-- =============================================
-- Ajoute source_text (texte original en français) pour :
--   1) Le mode "thème" qui passe maintenant par FR puis traduit en WO
--   2) Le futur mode "importer + traduire" (texte FR uploadé)
--
-- Permet d'afficher le FR à côté du WO dans la page édition pour aider
-- le client à corriger les traductions douteuses.
-- =============================================

ALTER TABLE public.phrase_drafts
  ADD COLUMN IF NOT EXISTS source_text TEXT;
