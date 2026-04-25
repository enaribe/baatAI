// Helpers Gemini partagés entre les Edge Functions Daandé.
//
// Centralise :
//   - Appel Gemini avec parsing JSON défensif (markdown stripping)
//   - Retry avec backoff exponentiel sur 429/500/503
//   - Exécution concurrente avec limite (worker pool)
//
// Usage :
//   import { callGeminiJSON, callWithRetry, runWithConcurrency, GEMINI_MODEL } from '../_shared/gemini.ts'

export const GEMINI_MODEL = "gemini-flash-latest";
export const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

export interface GeminiCallOptions {
  /** Température 0-1 (créatif) */
  temperature?: number;
  /** Top-p sampling (optionnel) */
  topP?: number;
  /** Maximum output tokens (optionnel) */
  maxOutputTokens?: number;
}

/**
 * Appelle Gemini avec un prompt et parse la réponse en JSON typé.
 * Gère le markdown stripping défensif (Gemini retourne parfois ```json ...```
 * malgré responseMimeType=application/json).
 *
 * Throws : Error avec status sur réponses non-2xx pour permettre le retry.
 */
export async function callGeminiJSON<T>(
  apiKey: string,
  prompt: string,
  opts: GeminiCallOptions = {},
): Promise<T> {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        ...(opts.topP !== undefined && { topP: opts.topP }),
        ...(opts.maxOutputTokens !== undefined && { maxOutputTokens: opts.maxOutputTokens }),
        responseMimeType: "application/json",
        // Désactive le mode "thinking" (gemini-3-flash-preview) qui consomme
        // des tokens en réflexion avant de répondre. Inutile pour du JSON structuré.
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

  // Cleanup défensif : Gemini renvoie parfois ```json ... ``` ou du texte
  // avant/après le JSON malgré responseMimeType.
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
  } catch (_e) {
    console.error("Gemini invalid JSON. Raw:", text.slice(0, 500));
    throw new Error("gemini_invalid_json");
  }
}

/**
 * Wrapper avec retry exponentiel sur erreurs transitoires (429, 500, 503).
 * Les autres erreurs (400, 401, 403, etc.) sont propagées immédiatement.
 *
 * Usage :
 *   const result = await callWithRetry(() => callGeminiJSON(apiKey, prompt))
 */
export async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as Error & { status?: number };
      lastError = e;
      const isRetryable = e.status === 429 || e.status === 503 || e.status === 500;
      if (!isRetryable || attempt === MAX_RETRIES) throw e;
      const delay = RETRY_DELAYS_MS[attempt] ?? 8000;
      console.warn(`Gemini retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (status ${e.status})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("gemini_unknown_error");
}

/**
 * Exécute une liste de tâches async avec une concurrence maximale.
 * Préserve l'ordre des résultats (PromiseSettledResult[]).
 *
 * Pratique pour batcher des appels Gemini sans saturer la rate limit.
 * Recommandé : limit=2 pour Gemini gratuit, 4-8 pour Gemini billing.
 */
export async function runWithConcurrency<T>(
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
