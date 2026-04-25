-- =============================================
-- Daandé — Migration 053 : index unique (subtopic_id, position) sur phrase_drafts
-- =============================================
-- Fix audit M8.
--
-- Le code edge function calcule la position correctement (max+1 puis incrément),
-- mais en cas de bug futur ou de race condition (2 INSERT concurrents), on
-- pourrait avoir 2 drafts à la même position dans le même sous-thème.
-- Cet index unique est une garantie DB qui détecte le problème immédiatement.
--
-- Si la migration échoue à cause de doublons existants, c'est qu'il y a un
-- bug à investiguer plutôt qu'à masquer. Dans ce cas, exécuter d'abord :
--   SELECT subtopic_id, position, count(*)
--     FROM public.phrase_drafts
--    GROUP BY subtopic_id, position
--   HAVING count(*) > 1;
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_phrase_drafts_subtopic_position_unique
  ON public.phrase_drafts (subtopic_id, position);
