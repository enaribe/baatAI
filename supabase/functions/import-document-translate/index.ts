// import-document-translate
//
// Le client uploade un document texte (.txt ou .md) en français.
// On segmente en phrases côté Deno, on crée un sous-thème "imported",
// puis on traduit batch par batch via Gemini vers la langue cible du projet.
//
// Limites :
//   - Fichier max 5 MB
//   - Max 2000 phrases (au-delà : on garde les 2000 premières + warning)
//   - Quota projet 5000 phrases (cumulé avec subtopics existants)
//   - Rate limit : 5 imports/heure/utilisateur

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimitDB } from "../_shared/rate-limit-db.ts";
import { callGeminiJSON, callWithRetry, runWithConcurrency } from "../_shared/gemini.ts";
import {
  IMPORT_DOC_MAX_BYTES,
  IMPORT_DOC_MAX_PHRASES,
  PROJECT_PHRASE_QUOTA,
  TRANSLATE_BATCH_SIZE,
  GEMINI_MAX_PARALLEL,
  PHRASE_MAX_LENGTH,
  SUBTOPIC_TITLE_MAX,
  RATE_LIMIT_IMPORT_DOC,
} from "../_shared/quotas.ts";

const MAX_FILE_SIZE = IMPORT_DOC_MAX_BYTES;
const MAX_PHRASES = IMPORT_DOC_MAX_PHRASES;
const MAX_PARALLEL = GEMINI_MAX_PARALLEL;

interface ProjectRow {
  id: string;
  owner_id: string;
  target_language: string;
  language_label: string | null;
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Vérifie qu'une chaîne ressemble à du texte exploitable (et pas à un binaire
 * renommé en .txt/.md). On regarde le ratio de caractères imprimables ASCII +
 * UTF-8 courants. Refuse si le contenu est majoritairement de la donnée binaire,
 * pour éviter d'envoyer du garbage à Gemini (et payer pour rien).
 */
function isPlausibleText(s: string): boolean {
  if (s.length < 10) return false;
  // Compte les caractères de contrôle (hors \n \r \t) qui ne devraient pas
  // apparaître dans du texte normal.
  // eslint-disable-next-line no-control-regex
  const controlChars = (s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) ?? []).length;
  const ratio = controlChars / s.length;
  // Tolérance < 1 % de caractères de contrôle (vrais .txt en ont 0)
  return ratio < 0.01;
}

/**
 * Strip Markdown courant (titres, gras, italique, liens, listes, code).
 * On vise la lisibilité, pas une conversion parfaite.
 */
function stripMarkdown(md: string): string {
  return md
    // Code blocks ``` ... ```
    .replace(/```[\s\S]*?```/g, " ")
    // Code inline `...`
    .replace(/`([^`]+)`/g, "$1")
    // Images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    // Liens [texte](url) → texte
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Titres # ## ### ...
    .replace(/^#{1,6}\s+/gm, "")
    // Gras **txt** ou __txt__
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // Italique *txt* ou _txt_
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Listes - * + en début de ligne
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Listes ordonnées 1. 2. ...
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Citations >
    .replace(/^>\s+/gm, "")
    // HRules
    .replace(/^[-*_]{3,}$/gm, " ")
    // Tables (basique : virer les pipes)
    .replace(/\|/g, " ");
}

/**
 * Segmente du texte en phrases. Approche :
 *   1) Normalise les espaces/sauts de ligne
 *   2) Split sur ponctuation finale ( . ! ? … ) en gardant le délimiteur
 *   3) Filtre par longueur et complétude
 */
function splitIntoPhrases(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, ". ") // double saut de ligne = fin de paragraphe = ponctuation
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split en gardant la ponctuation finale
  // Regex : capture jusqu'à la 1ère ponctuation finale incluse
  const parts = normalized.match(/[^.!?…]+[.!?…]+/g) ?? [normalized];

  const phrases: string[] = [];
  for (const raw of parts) {
    const cleaned = raw
      .trim()
      // Retire ponctuation orpheline en début
      .replace(/^[.,;:!?…\-—\s]+/, "")
      .trim();

    // Filtre par longueur : 5 char min, 500 max
    if (cleaned.length < 5 || cleaned.length > 500) continue;
    // Doit contenir au moins 2 mots
    if (cleaned.split(/\s+/).length < 2) continue;

    phrases.push(cleaned);
  }

  return phrases;
}

function dedupePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of phrases) {
    const key = p.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

async function translateBatch(
  apiKey: string,
  language: string,
  phrasesFR: string[],
): Promise<string[]> {
  const numbered = phrasesFR.map((p, i) => `${i + 1}. ${p}`).join("\n");
  const prompt = `Traduis ces ${phrasesFR.length} phrases du français vers le ${language}.

Règles strictes :
- Conserve l'ordre exact
- Conserve le nombre exact (${phrasesFR.length} traductions)
- Traduis NATURELLEMENT, adapte la syntaxe à la langue cible
- Garde le registre et le ton de la phrase originale
- Si un nom propre n'a pas d'équivalent, garde-le tel quel
- Pas de note, pas d'explication, juste les traductions

Phrases :
${numbered}

Réponds UNIQUEMENT avec un JSON valide :
{ "translations": ["...", "...", ...] }`;

  const parsed = await callGeminiJSON<{ translations?: unknown }>(apiKey, prompt, { temperature: 0.3 });
  if (!Array.isArray(parsed.translations)) throw new Error("gemini_invalid_structure");

  // I8 : validation stricte. Pour chaque slot attendu, on vérifie le type.
  // Fallback sur le FR si traduction manquante/invalide → garantit qu'on
  // n'aura jamais de phrase vide en DB.
  const out: string[] = [];
  for (let i = 0; i < phrasesFR.length; i++) {
    const t = parsed.translations[i];
    if (typeof t === "string" && t.trim().length > 0) {
      out.push(t.trim().slice(0, PHRASE_MAX_LENGTH));
    } else {
      out.push(phrasesFR[i]);
    }
  }
  return out;
}

async function markFailed(supabase: SupabaseClient, subtopicId: string, reason: string): Promise<void> {
  await supabase
    .from("subtopics")
    .update({ status: "failed", failed_reason: reason })
    .eq("id", subtopicId);
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return handlePreflight(corsHeaders);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405, corsHeaders);
  }

  let createdSubtopicId: string | null = null;
  let supabaseForCleanup: SupabaseClient | null = null;

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!jwt) {
      return jsonResponse({ error: "Utilisateur non authentifié" }, 401, corsHeaders);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      },
    );
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    supabaseForCleanup = supabase;

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Utilisateur non authentifié" }, 401, corsHeaders);
    }

    // 2. Rate limit (persistant en DB)
    if (await checkRateLimitDB(supabase, `import-doc:${user.id}`, RATE_LIMIT_IMPORT_DOC)) {
      return jsonResponse(
        { error: "Trop d'imports récents. Réessayez dans une heure." },
        429,
        corsHeaders,
      );
    }

    // 3. Lecture multipart
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("project_id") as string | null)?.trim();
    const subtopicTitle = (formData.get("subtopic_title") as string | null)?.trim() || "Document importé";

    if (!file || !projectId) {
      return jsonResponse(
        { error: "Champs requis : file, project_id" },
        400,
        corsHeaders,
      );
    }

    // 4. Validation fichier
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / (1024 * 1024)} MB)` },
        413,
        corsHeaders,
      );
    }

    const lowerName = file.name.toLowerCase();
    const isMd = lowerName.endsWith(".md");
    const isTxt = lowerName.endsWith(".txt");
    if (!isMd && !isTxt) {
      return jsonResponse(
        { error: "Format non supporté. Utilisez .txt ou .md" },
        415,
        corsHeaders,
      );
    }

    // 5. Vérifier ownership projet
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, owner_id, target_language, language_label")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return jsonResponse({ error: "Projet introuvable" }, 404, corsHeaders);
    }
    const projectRow = project as ProjectRow;
    if (projectRow.owner_id !== user.id) {
      return jsonResponse({ error: "Accès refusé à ce projet" }, 403, corsHeaders);
    }

    // 6. Parse fichier
    let rawText = await file.text();

    // Garde-fou : refuse les fichiers binaires renommés .txt/.md (évite envoi
    // garbage à Gemini = coût direct).
    if (!isPlausibleText(rawText)) {
      return jsonResponse(
        { error: "Le fichier ne contient pas de texte exploitable. Vérifiez qu'il s'agit bien d'un .txt ou .md valide." },
        400,
        corsHeaders,
      );
    }

    if (isMd) rawText = stripMarkdown(rawText);
    let phrasesFR = splitIntoPhrases(rawText);
    phrasesFR = dedupePhrases(phrasesFR);

    if (phrasesFR.length === 0) {
      return jsonResponse(
        { error: "Aucune phrase exploitable détectée dans le fichier" },
        400,
        corsHeaders,
      );
    }

    let truncated = false;
    if (phrasesFR.length > MAX_PHRASES) {
      phrasesFR = phrasesFR.slice(0, MAX_PHRASES);
      truncated = true;
    }

    // 7. Vérifier quota cumulé sur le projet
    const { data: existing } = await supabase
      .from("subtopics")
      .select("target_count")
      .eq("project_id", projectId);
    const existingTotal = (existing ?? []).reduce(
      (s, x: { target_count: number }) => s + (x.target_count ?? 0),
      0,
    );
    if (existingTotal + phrasesFR.length > PROJECT_PHRASE_QUOTA) {
      return jsonResponse(
        {
          error: `Quota dépassé. Ce projet a déjà ${existingTotal} phrases planifiées sur ${PROJECT_PHRASE_QUOTA}. Le fichier ajouterait ${phrasesFR.length} phrases.`,
        },
        400,
        corsHeaders,
      );
    }

    // 8. Position max actuelle pour le subtopic
    const { data: maxRow } = await supabase
      .from("subtopics")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const startPosition = ((maxRow as { position?: number } | null)?.position ?? 0) + 1;

    // 9. Création subtopic en statut generating
    const { data: createdRow, error: createErr } = await supabase
      .from("subtopics")
      .insert({
        project_id: projectId,
        position: startPosition,
        title: subtopicTitle.slice(0, SUBTOPIC_TITLE_MAX),
        description: `Importé depuis ${file.name} (${phrasesFR.length} phrases)`,
        target_count: phrasesFR.length,
        source: "imported",
        status: "generating",
      } as never)
      .select("id")
      .single();

    if (createErr || !createdRow) {
      console.error("Create subtopic failed:", createErr);
      return jsonResponse(
        { error: "Erreur lors de la création du sous-thème" },
        500,
        corsHeaders,
      );
    }

    createdSubtopicId = (createdRow as { id: string }).id;

    // 10. Traduction par batches
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY manquante");
      await markFailed(supabase, createdSubtopicId, "Configuration serveur manquante");
      return jsonResponse({ error: "Configuration serveur manquante" }, 500, corsHeaders);
    }

    const language = projectRow.language_label || projectRow.target_language || "Wolof";

    // Si la langue cible est le français, pas besoin de traduire
    const isFrenchTarget = language.toLowerCase().startsWith("fran");

    let pairs: Array<{ source: string; target: string }>;

    if (isFrenchTarget) {
      pairs = phrasesFR.map((p) => ({ source: p, target: p }));
    } else {
      const batches: Array<() => Promise<{ start: number; translations: string[] }>> = [];
      for (let i = 0; i < phrasesFR.length; i += TRANSLATE_BATCH_SIZE) {
        const slice = phrasesFR.slice(i, i + TRANSLATE_BATCH_SIZE);
        const start = i;
        batches.push(async () => ({
          start,
          translations: await callWithRetry(() => translateBatch(apiKey, language, slice)),
        }));
      }

      const settled = await runWithConcurrency(batches, MAX_PARALLEL);
      let failureCount = 0;
      const ordered: Array<{ source: string; target: string }> = phrasesFR.map((p) => ({ source: p, target: p }));

      for (const r of settled) {
        if (r.status === "fulfilled") {
          for (let j = 0; j < r.value.translations.length; j++) {
            const idx = r.value.start + j;
            if (idx < ordered.length) {
              ordered[idx].target = r.value.translations[j] || phrasesFR[idx];
            }
          }
        } else {
          failureCount++;
          console.error("Translate batch failed:", r.reason);
        }
      }

      pairs = ordered;

      if (failureCount === settled.length) {
        await markFailed(supabase, createdSubtopicId, "Toutes les traductions ont échoué");
        createdSubtopicId = null;
        return jsonResponse(
          { error: "L'IA n'a pas pu traduire le document. Réessayez." },
          502,
          corsHeaders,
        );
      }
    }

    // 11. INSERT phrase_drafts
    const rows = pairs.map((pair, i) => ({
      subtopic_id: createdSubtopicId,
      project_id: projectId,
      position: i + 1,
      content: pair.target,
      source_text: pair.source,
      edited: false,
    }));

    // INSERT par chunks pour éviter les requêtes trop grosses
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase.from("phrase_drafts").insert(chunk);
      if (insertErr) {
        console.error("Insert phrase_drafts failed:", insertErr);
        await markFailed(supabase, createdSubtopicId, "Erreur lors de l'enregistrement");
        createdSubtopicId = null;
        return jsonResponse(
          { error: "Erreur lors de l'enregistrement des phrases" },
          500,
          corsHeaders,
        );
      }
    }

    // 12. Update subtopic → ready
    await supabase
      .from("subtopics")
      .update({
        status: "ready",
        generated_count: rows.length,
        generated_at: new Date().toISOString(),
      })
      .eq("id", createdSubtopicId);

    const finalSubtopicId = createdSubtopicId;
    createdSubtopicId = null;

    return jsonResponse(
      {
        data: {
          subtopic_id: finalSubtopicId,
          phrases_imported: rows.length,
          truncated,
        },
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("import-document-translate error:", err);
    if (createdSubtopicId && supabaseForCleanup) {
      await markFailed(supabaseForCleanup, createdSubtopicId, "Erreur interne du serveur").catch(() => {});
    }
    return jsonResponse({ error: "Erreur interne du serveur" }, 500, corsHeaders);
  }
});
