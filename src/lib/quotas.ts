// Limites partagées de la feature génération IA / sous-thèmes.
// Source de vérité côté front. Les edge functions ont leur propre copie
// dans supabase/functions/_shared/quotas.ts (Deno ne peut pas importer ce
// fichier directement).
//
// Si tu modifies une valeur ici, modifie aussi _shared/quotas.ts ET les
// migrations SQL qui hardcodent ces limites (045, 049, 050).

/** Nombre max de phrases planifiables par projet (somme des target_count). */
export const PROJECT_PHRASE_QUOTA = 5000

/** Nombre min de phrases pour une génération depuis un thème. */
export const AI_PLAN_MIN_TOTAL = 100

/** Nombre max de phrases pour une génération depuis un thème. */
export const AI_PLAN_MAX_TOTAL = PROJECT_PHRASE_QUOTA

/** Presets affichés sur la sélection de quantité. */
export const AI_PLAN_PRESETS = [500, 1000, 2000, 5000] as const

/** Bornes par sous-thème individuel (manuel ou IA). */
export const SUBTOPIC_MIN_PHRASES = 50
export const SUBTOPIC_MAX_PHRASES = 500

/** Longueur titre sous-thème. */
export const SUBTOPIC_TITLE_MIN = 3
export const SUBTOPIC_TITLE_MAX = 200

/** Longueur description sous-thème. */
export const SUBTOPIC_DESC_MAX = 500

/** Longueur max d'une phrase (FR ou WO). */
export const PHRASE_MAX_LENGTH = 500

/** Import doc : taille fichier max (octets). */
export const IMPORT_DOC_MAX_BYTES = 5 * 1024 * 1024

/** Import doc : extensions acceptées. */
export const IMPORT_DOC_ALLOWED_EXTENSIONS = ['.txt', '.md'] as const

/** Import doc : nombre max de phrases extraites. Au-delà : tronqué + warning. */
export const IMPORT_DOC_MAX_PHRASES = 2000

/** Append "Générer en plus" : bornes du nombre supplémentaire. */
export const APPEND_MIN = 10
export const APPEND_MAX = 500
export const APPEND_DEFAULT = 50
