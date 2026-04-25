// generate-subtopic-phrases
//
// Génère les phrases d'un sous-thème via Gemini en batches parallèles.
// Le client envoie : { subtopic_id, mode: 'replace' | 'append', extra_count? }
//
// - mode 'replace' : DELETE les drafts existants, génère target_count phrases
// - mode 'append'  : ajoute extra_count phrases (avec contexte des existantes
//                    pour éviter doublons)
//
// Le statut du subtopic passe : pending → generating → ready (ou failed).
// Le frontend écoute via Supabase Realtime sur la table `subtopics`.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimitDB } from "../_shared/rate-limit-db.ts";
import { callGeminiJSON, callWithRetry, runWithConcurrency } from "../_shared/gemini.ts";
import {
  PHRASE_BATCH_SIZE,
  GEMINI_MAX_PARALLEL,
  PHRASE_MAX_LENGTH,
  APPEND_MIN,
  APPEND_MAX,
  APPEND_DEFAULT,
  RATE_LIMIT_GEN_PHRASES,
} from "../_shared/quotas.ts";

const BATCH_SIZE = PHRASE_BATCH_SIZE;
const MAX_PARALLEL = GEMINI_MAX_PARALLEL;

interface SubtopicRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_count: number;
  status: string;
}

interface ProjectRow {
  id: string;
  owner_id: string;
  target_language: string;
  language_label: string | null;
  usage_type: string | null;
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PhrasePair {
  source: string;  // texte FR original
  target: string;  // traduction dans la langue cible
}

/**
 * Étape 1 : génère N phrases EN FRANÇAIS sur un sous-thème.
 * Le français est la langue forte de Gemini → phrases naturelles, variées.
 */
async function generatePhrasesFR(
  apiKey: string,
  params: {
    subtopicTitle: string;
    subtopicDescription: string;
    usageType: string;
    batchSize: number;
    excludeSamples: string[]; // déjà en FR si dispo
  },
): Promise<string[]> {
  const usageHint = params.usageType === "tts"
    ? "phonétiquement variées (couvrent un large éventail de sons)"
    : params.usageType === "asr"
    ? "naturelles, conversationnelles, telles qu'un locuteur les prononcerait spontanément"
    : "naturelles et phonétiquement variées";

  const excludeSection = params.excludeSamples.length > 0
    ? `\n\nÉvite de répéter ces phrases déjà existantes (ou des variantes proches) :\n${
      params.excludeSamples.slice(0, 30).map((p) => `- ${p}`).join("\n")
    }`
    : "";

  const prompt = `Génère exactement ${params.batchSize} phrases en français sur le sous-thème "${params.subtopicTitle}".

Description du sous-thème : ${params.subtopicDescription || "(aucune)"}

Contexte : ces phrases serviront ensuite à être traduites en langue africaine puis enregistrées vocalement par des locuteurs.

Les phrases doivent être ${usageHint}.

Règles strictes :
- Longueur : 5 à 15 mots par phrase
- Variété : mélange affirmations, questions, exclamations, négations
- Vocabulaire : courant et accessible, contextualisé pour l'Afrique de l'Ouest quand pertinent
- AUCUN doublon entre les phrases générées
- Phrases complètes, pas de fragments
- Pas d'emoji, pas de ponctuation décorative${excludeSection}

Réponds UNIQUEMENT avec un JSON valide, sans markdown :
{ "phrases": ["phrase 1", "phrase 2", ...] }`;

  const parsed = await callGeminiJSON<{ phrases?: unknown }>(apiKey, prompt, { temperature: 0.9 });
  if (!Array.isArray(parsed.phrases)) throw new Error("gemini_invalid_structure");

  // I8 : validation stricte. On rejette les fragments (< 3 mots), les phrases
  // trop longues (> 500 chars), les types non-string, les doublons exacts.
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of parsed.phrases) {
    if (typeof raw !== "string") continue;
    const p = raw.trim().slice(0, PHRASE_MAX_LENGTH);
    if (p.length < 5) continue;
    const wordCount = p.split(/\s+/).length;
    if (wordCount < 3) continue;
    const key = p.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(p);
  }

  // Si Gemini a renvoyé moins de la moitié de ce qu'on demandait, considère
  // ça comme un échec (souvent une réponse tronquée).
  if (cleaned.length < Math.max(1, Math.floor(params.batchSize / 2))) {
    throw new Error("gemini_too_few_valid_phrases");
  }

  return cleaned;
}

/**
 * Étape 2 : traduit un batch de phrases FR vers la langue cible.
 * Préserve l'ordre et le nombre. Si une traduction échoue, on garde le FR
 * dans target pour ne rien perdre (le client pourra corriger).
 */
async function translateBatch(
  apiKey: string,
  language: string,
  phrasesFR: string[],
): Promise<PhrasePair[]> {
  if (phrasesFR.length === 0) return [];

  const numbered = phrasesFR.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const prompt = `Traduis ces ${phrasesFR.length} phrases du français vers le ${language}.

Règles strictes :
- Conserve l'ordre exact
- Conserve le nombre exact (${phrasesFR.length} traductions)
- Traduis NATURELLEMENT, pas mot à mot. Adapte la syntaxe à la langue cible.
- Garde le registre et le ton de la phrase originale
- Si un nom propre n'a pas d'équivalent, garde-le tel quel
- Pas de note, pas d'explication, juste les traductions

Phrases à traduire :
${numbered}

Réponds UNIQUEMENT avec un JSON valide, sans markdown :
{ "translations": ["traduction 1", "traduction 2", ...] }`;

  const parsed = await callGeminiJSON<{ translations?: unknown }>(apiKey, prompt, { temperature: 0.3 });
  if (!Array.isArray(parsed.translations)) throw new Error("gemini_invalid_structure");

  // I8 : on attend exactement N traductions. Si moins, c'est suspect mais
  // on tolère et on remplit les manquantes avec le FR. Si plus, on tronque.
  const translations: string[] = [];
  for (const t of parsed.translations) {
    if (typeof t === "string") translations.push(t.trim().slice(0, PHRASE_MAX_LENGTH));
    else translations.push("");
  }

  const pairs: PhrasePair[] = [];
  for (let i = 0; i < phrasesFR.length; i++) {
    const target = translations[i] && translations[i].length > 0 ? translations[i] : phrasesFR[i];
    pairs.push({ source: phrasesFR[i], target });
  }
  return pairs;
}

/**
 * Pipeline complet d'un batch : génère FR puis traduit en langue cible.
 */
async function callGeminiBatch(
  apiKey: string,
  params: {
    language: string;
    subtopicTitle: string;
    subtopicDescription: string;
    usageType: string;
    batchSize: number;
    excludeSamples: string[];
  },
): Promise<PhrasePair[]> {
  const phrasesFR = await generatePhrasesFR(apiKey, {
    subtopicTitle: params.subtopicTitle,
    subtopicDescription: params.subtopicDescription,
    usageType: params.usageType,
    batchSize: params.batchSize,
    excludeSamples: params.excludeSamples,
  });

  if (phrasesFR.length === 0) return [];

  // Si la langue cible est le français (rare mais possible), pas besoin de traduire
  if (params.language.toLowerCase() === "français" || params.language.toLowerCase() === "francais") {
    return phrasesFR.map((p) => ({ source: p, target: p }));
  }

  return translateBatch(apiKey, params.language, phrasesFR);
}

async function dedupeAndCap(pairs: PhrasePair[], target: number): Promise<PhrasePair[]> {
  const seen = new Set<string>();
  const out: PhrasePair[] = [];
  for (const p of pairs) {
    const key = p.target.toLowerCase().replace(/\s+/g, " ").trim();
    if (key.length < 3) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= target) break;
  }
  return out;
}

async function markFailed(
  supabase: SupabaseClient,
  subtopicId: string,
  reason: string,
): Promise<void> {
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

  let subtopicIdForCleanup: string | null = null;
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

    // 2. Validation input
    const body = await req.json().catch(() => null) as
      | { subtopic_id?: string; mode?: string; extra_count?: number }
      | null;
    if (!body) {
      return jsonResponse({ error: "Body JSON invalide" }, 400, corsHeaders);
    }

    const subtopicId = body.subtopic_id?.trim();
    const mode = body.mode === "append" ? "append" : "replace";
    const extraCount = mode === "append"
      ? Math.max(APPEND_MIN, Math.min(APPEND_MAX, Number(body.extra_count) || APPEND_DEFAULT))
      : 0;

    if (!subtopicId) {
      return jsonResponse({ error: "subtopic_id requis" }, 400, corsHeaders);
    }

    // 3. Rate limit (persistant en DB)
    if (await checkRateLimitDB(supabase, `gen-phrases:${user.id}`, RATE_LIMIT_GEN_PHRASES)) {
      return jsonResponse(
        { error: "Trop de générations récentes. Réessayez dans une heure." },
        429,
        corsHeaders,
      );
    }

    // 4. Charger subtopic + project
    const { data: subtopic, error: subErr } = await supabase
      .from("subtopics")
      .select("id, project_id, title, description, target_count, status")
      .eq("id", subtopicId)
      .single();

    if (subErr || !subtopic) {
      return jsonResponse({ error: "Sous-thème introuvable" }, 404, corsHeaders);
    }

    const subtopicRow = subtopic as SubtopicRow;

    if (subtopicRow.status === "validated") {
      return jsonResponse(
        { error: "Sous-thème déjà validé. Dévalidez-le pour le régénérer." },
        409,
        corsHeaders,
      );
    }

    if (subtopicRow.status === "generating") {
      return jsonResponse({ error: "Génération déjà en cours" }, 409, corsHeaders);
    }

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, owner_id, target_language, language_label, usage_type")
      .eq("id", subtopicRow.project_id)
      .single();

    if (projErr || !project) {
      return jsonResponse({ error: "Projet introuvable" }, 404, corsHeaders);
    }

    const projectRow = project as ProjectRow;

    if (projectRow.owner_id !== user.id) {
      return jsonResponse({ error: "Accès refusé à ce projet" }, 403, corsHeaders);
    }

    // 5. Clé Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY manquante");
      return jsonResponse({ error: "Configuration serveur manquante" }, 500, corsHeaders);
    }

    // 6. Marquer le subtopic en "generating"
    subtopicIdForCleanup = subtopicId;
    await supabase
      .from("subtopics")
      .update({ status: "generating", failed_reason: null })
      .eq("id", subtopicId);

    // 7. Si replace : supprimer les drafts existants. Sinon : récupère échantillon pour exclusion
    let excludeSamples: string[] = [];
    let startPosition = 0;
    let targetForRun: number;

    if (mode === "replace") {
      await supabase
        .from("phrase_drafts")
        .delete()
        .eq("subtopic_id", subtopicId);
      targetForRun = subtopicRow.target_count;
    } else {
      const { data: existingDrafts } = await supabase
        .from("phrase_drafts")
        .select("position, content, source_text")
        .eq("subtopic_id", subtopicId)
        .order("position", { ascending: false });

      const drafts = (existingDrafts ?? []) as Array<{
        position: number;
        content: string;
        source_text: string | null;
      }>;
      startPosition = drafts.length > 0 ? drafts[0].position : 0;
      // Exclusion en FR (source_text) pour aider Gemini à éviter doublons en génération.
      // Fallback sur content si source_text manque (anciens drafts).
      excludeSamples = drafts.slice(0, 30).map((d) => d.source_text ?? d.content);
      targetForRun = extraCount;
    }

    // 8. Préparer batches
    const language = projectRow.language_label || projectRow.target_language || "Wolof";
    const usageType = projectRow.usage_type || "asr";
    const batchCount = Math.ceil(targetForRun / BATCH_SIZE);
    const batches: Array<() => Promise<PhrasePair[]>> = [];

    for (let i = 0; i < batchCount; i++) {
      const remaining = targetForRun - i * BATCH_SIZE;
      const size = Math.min(BATCH_SIZE, remaining);
      batches.push(() =>
        callWithRetry(() => callGeminiBatch(apiKey, {
          language,
          subtopicTitle: subtopicRow.title,
          subtopicDescription: subtopicRow.description ?? "",
          usageType,
          batchSize: size,
          excludeSamples,
        }))
      );
    }

    // 9. Exécution avec concurrence limitée
    const settled = await runWithConcurrency(batches, MAX_PARALLEL);
    const allPairs: PhrasePair[] = [];
    let failureCount = 0;

    for (const r of settled) {
      if (r.status === "fulfilled") {
        allPairs.push(...r.value);
      } else {
        failureCount++;
        console.error("Batch failed:", r.reason);
      }
    }

    if (allPairs.length === 0) {
      await markFailed(supabase, subtopicId, "Aucune phrase générée par l'IA");
      subtopicIdForCleanup = null;
      return jsonResponse(
        { error: "L'IA n'a généré aucune phrase. Réessayez." },
        502,
        corsHeaders,
      );
    }

    // 10. Dédup + cap au target
    let finalPairs = await dedupeAndCap(allPairs, targetForRun);

    // 10b. Si on est significativement sous le target, lancer un batch de complétion
    const shortfall = targetForRun - finalPairs.length;
    if (shortfall >= 20 && failureCount < settled.length) {
      try {
        const fillSize = Math.min(BATCH_SIZE, shortfall);
        const fillExclude = finalPairs.slice(0, 30).map((p) => p.source);
        const fill = await callWithRetry(() => callGeminiBatch(apiKey, {
          language,
          subtopicTitle: subtopicRow.title,
          subtopicDescription: subtopicRow.description ?? "",
          usageType,
          batchSize: fillSize,
          excludeSamples: [...excludeSamples, ...fillExclude],
        }));
        finalPairs = await dedupeAndCap([...finalPairs, ...fill], targetForRun);
      } catch (fillErr) {
        console.warn("Fill batch failed:", fillErr);
      }
    }

    // 11. INSERT phrase_drafts (content = traduction WO, source_text = original FR)
    const rows = finalPairs.map((pair, i) => ({
      subtopic_id: subtopicId,
      project_id: subtopicRow.project_id,
      position: startPosition + i + 1,
      content: pair.target,
      source_text: pair.source,
      edited: false,
    }));

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("phrase_drafts").insert(rows);
      if (insertErr) {
        console.error("Insert phrase_drafts failed:", insertErr);
        await markFailed(supabase, subtopicId, "Erreur lors de l'enregistrement");
        subtopicIdForCleanup = null;
        return jsonResponse(
          { error: "Erreur lors de l'enregistrement des phrases" },
          500,
          corsHeaders,
        );
      }
    }

    // 12. Compter le total final pour ce subtopic
    const { count: totalCount } = await supabase
      .from("phrase_drafts")
      .select("id", { count: "exact", head: true })
      .eq("subtopic_id", subtopicId);

    // 13. Update statut → ready
    await supabase
      .from("subtopics")
      .update({
        status: "ready",
        generated_count: totalCount ?? rows.length,
        generated_at: new Date().toISOString(),
        failed_reason: failureCount > 0 ? `${failureCount} batch(es) ont échoué` : null,
      })
      .eq("id", subtopicId);

    subtopicIdForCleanup = null;

    return jsonResponse(
      {
        data: {
          subtopic_id: subtopicId,
          generated: rows.length,
          total: totalCount ?? rows.length,
          partial_failures: failureCount,
        },
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("generate-subtopic-phrases error:", err);
    if (subtopicIdForCleanup && supabaseForCleanup) {
      await markFailed(supabaseForCleanup, subtopicIdForCleanup, "Erreur interne du serveur").catch(() => {});
    }
    return jsonResponse({ error: "Erreur interne du serveur" }, 500, corsHeaders);
  }
});
