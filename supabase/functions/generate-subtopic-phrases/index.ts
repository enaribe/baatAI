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
import { checkRateLimit } from "../_shared/rate-limit.ts";

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const BATCH_SIZE = 50;
const MAX_PARALLEL = 2;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

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
 * Helper générique pour appeler Gemini avec un prompt et parser le JSON retourné.
 * Gère les retries via le wrapper appelant.
 */
async function callGeminiJSON<T>(apiKey: string, prompt: string, temperature: number): Promise<T> {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Gemini error:", response.status, errBody.slice(0, 300));
    const err = new Error(`gemini_api_error_${response.status}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini_empty_response");

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleanText = cleanText.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error("Gemini invalid JSON. Raw:", text.slice(0, 500));
    throw new Error("gemini_invalid_json");
  }
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

  const parsed = await callGeminiJSON<{ phrases?: unknown }>(apiKey, prompt, 0.9);
  if (!Array.isArray(parsed.phrases)) throw new Error("gemini_invalid_structure");

  return parsed.phrases
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim().slice(0, 500));
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

  const parsed = await callGeminiJSON<{ translations?: unknown }>(apiKey, prompt, 0.3);
  if (!Array.isArray(parsed.translations)) throw new Error("gemini_invalid_structure");

  const translations = parsed.translations.map((t) =>
    typeof t === "string" ? t.trim().slice(0, 500) : ""
  );

  // Si Gemini retourne un mauvais nombre, on aligne défensivement
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

async function callGeminiBatchWithRetry(
  apiKey: string,
  params: Parameters<typeof callGeminiBatch>[1],
): Promise<PhrasePair[]> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGeminiBatch(apiKey, params);
    } catch (err) {
      const e = err as Error & { status?: number };
      lastError = e;
      const isRetryable = e.status === 429 || e.status === 503 || e.status === 500;
      if (!isRetryable || attempt === MAX_RETRIES) throw e;
      const delay = RETRY_DELAYS_MS[attempt] ?? 8000;
      console.warn(`Batch retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (status ${e.status})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("gemini_unknown_error");
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= tasks.length) return;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: "fulfilled", value };
      } catch (err) {
        results[idx] = { status: "rejected", reason: err };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
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
    const extraCount = mode === "append" ? Math.max(10, Math.min(500, Number(body.extra_count) || 50)) : 0;

    if (!subtopicId) {
      return jsonResponse({ error: "subtopic_id requis" }, 400, corsHeaders);
    }

    // 3. Rate limit : 30 générations / heure / utilisateur
    if (checkRateLimit(`gen-phrases:${user.id}`, { max: 30, windowSec: 3600 })) {
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
    const batches: Array<() => Promise<string[]>> = [];

    for (let i = 0; i < batchCount; i++) {
      const remaining = targetForRun - i * BATCH_SIZE;
      const size = Math.min(BATCH_SIZE, remaining);
      batches.push(() =>
        callGeminiBatchWithRetry(apiKey, {
          language,
          subtopicTitle: subtopicRow.title,
          subtopicDescription: subtopicRow.description ?? "",
          usageType,
          batchSize: size,
          excludeSamples,
        })
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
        const fill = await callGeminiBatchWithRetry(apiKey, {
          language,
          subtopicTitle: subtopicRow.title,
          subtopicDescription: subtopicRow.description ?? "",
          usageType,
          batchSize: fillSize,
          excludeSamples: [...excludeSamples, ...fillExclude],
        });
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
