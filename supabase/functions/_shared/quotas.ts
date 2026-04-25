// Limites partagées de la feature génération IA / sous-thèmes.
// Miroir de src/lib/quotas.ts pour le runtime Deno (Edge Functions).
//
// Garde les 2 fichiers en phase. Les migrations SQL ont aussi leurs propres
// hardcodes (045, 049, 050) — un changement de quota = update aux 3 endroits.

export const PROJECT_PHRASE_QUOTA = 5000;
export const AI_PLAN_MIN_TOTAL = 100;
export const AI_PLAN_MAX_TOTAL = PROJECT_PHRASE_QUOTA;

export const SUBTOPIC_MIN_PHRASES = 50;
export const SUBTOPIC_MAX_PHRASES = 500;

export const SUBTOPIC_TITLE_MIN = 3;
export const SUBTOPIC_TITLE_MAX = 200;
export const SUBTOPIC_DESC_MAX = 500;

export const PHRASE_MAX_LENGTH = 500;

export const IMPORT_DOC_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_DOC_MAX_PHRASES = 2000;

export const APPEND_MIN = 10;
export const APPEND_MAX = 500;
export const APPEND_DEFAULT = 50;

/** Génération phrases : taille de batch et concurrence */
export const PHRASE_BATCH_SIZE = 50;
export const TRANSLATE_BATCH_SIZE = 30;
export const GEMINI_MAX_PARALLEL = 2;

/** Rate limits */
export const RATE_LIMIT_GEN_PLAN = { max: 5, windowSec: 3600 };
export const RATE_LIMIT_GEN_PHRASES = { max: 30, windowSec: 3600 };
export const RATE_LIMIT_IMPORT_DOC = { max: 5, windowSec: 3600 };
