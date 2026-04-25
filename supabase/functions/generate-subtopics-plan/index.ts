// generate-subtopics-plan
//
// Génère un plan de sous-thèmes via Gemini pour un projet donné.
// Le client envoie : { project_id, theme, language, total_count }
// On insère N rows dans la table `subtopics` (status=pending).
//
// Quotas :
//   - max 5000 phrases par projet (somme des target_count existants + nouveaux)
//   - rate limit : 5 plans / utilisateur / heure (évite l'abus de tokens Gemini)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimitDB } from "../_shared/rate-limit-db.ts";
import { callGeminiJSON } from "../_shared/gemini.ts";
import {
  PROJECT_PHRASE_QUOTA,
  AI_PLAN_MIN_TOTAL,
  SUBTOPIC_MIN_PHRASES,
  SUBTOPIC_MAX_PHRASES,
  SUBTOPIC_TITLE_MAX,
  SUBTOPIC_DESC_MAX,
  RATE_LIMIT_GEN_PLAN,
} from "../_shared/quotas.ts";

interface GeminiSubtopic {
  title: string;
  description: string;
  target_count: number;
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGeminiPlan(
  apiKey: string,
  theme: string,
  language: string,
  totalCount: number,
): Promise<GeminiSubtopic[]> {
  const prompt = `Tu es un expert en linguistique africaine spécialisé dans la création de datasets vocaux pour ${language}.

Thème du dataset : "${theme}"
Quantité totale visée : ${totalCount} phrases

Découpe ce thème en sous-thèmes pertinents et équilibrés pour la collecte vocale. Chaque sous-thème doit :
- Couvrir un aspect distinct du thème, sans recouvrement avec les autres
- Avoir une quantité proportionnelle à la richesse linguistique du sujet (un sujet large = plus de phrases)
- Être nommé clairement en français

Règles strictes :
- Génère entre 5 et 15 sous-thèmes
- La somme des target_count doit égaler EXACTEMENT ${totalCount}
- Chaque sous-thème : minimum 50 phrases, maximum 500
- Description en 1 phrase concise (15-25 mots)

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte avant/après :
{
  "subtopics": [
    { "title": "...", "description": "...", "target_count": 350 },
    ...
  ]
}`;

  const parsed = await callGeminiJSON<{ subtopics?: unknown }>(apiKey, prompt, { temperature: 0.7 });

  if (!Array.isArray(parsed.subtopics) || parsed.subtopics.length < 3) {
    throw new Error("gemini_invalid_structure");
  }

  // Validation + clamp défensif (I8) : on ne fait confiance à aucun champ.
  const validated: GeminiSubtopic[] = [];
  for (const raw of parsed.subtopics) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.title !== "string" || s.title.trim().length === 0) continue;
    const count = Number(s.target_count);
    if (!Number.isFinite(count) || count < 1) continue;
    validated.push({
      title: s.title.trim().slice(0, SUBTOPIC_TITLE_MAX),
      description: typeof s.description === "string" ? s.description.trim().slice(0, SUBTOPIC_DESC_MAX) : "",
      target_count: Math.max(SUBTOPIC_MIN_PHRASES, Math.min(SUBTOPIC_MAX_PHRASES, Math.round(count))),
    });
  }

  if (validated.length < 3) {
    throw new Error("gemini_too_few_valid_subtopics");
  }

  return validated;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return handlePreflight(corsHeaders);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405, corsHeaders);
  }

  try {
    // 1. Auth utilisateur
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Utilisateur non authentifié" }, 401, corsHeaders);
    }

    // 2. Validation input
    const body = await req.json().catch(() => null) as
      | { project_id?: string; theme?: string; language?: string; total_count?: number }
      | null;
    if (!body) {
      return jsonResponse({ error: "Body JSON invalide" }, 400, corsHeaders);
    }

    const projectId = body.project_id?.trim();
    const theme = body.theme?.trim();
    const language = body.language?.trim();
    const totalCount = Number(body.total_count);

    if (!projectId || !theme || !language) {
      return jsonResponse(
        { error: "Champs requis : project_id, theme, language, total_count" },
        400,
        corsHeaders,
      );
    }

    if (theme.length < 5 || theme.length > 200) {
      return jsonResponse(
        { error: "Le thème doit faire entre 5 et 200 caractères" },
        400,
        corsHeaders,
      );
    }

    if (!Number.isFinite(totalCount) || totalCount < AI_PLAN_MIN_TOTAL || totalCount > PROJECT_PHRASE_QUOTA) {
      return jsonResponse(
        { error: `La quantité doit être entre ${AI_PLAN_MIN_TOTAL} et ${PROJECT_PHRASE_QUOTA} phrases` },
        400,
        corsHeaders,
      );
    }

    // 3. Rate limit (persistant en DB)
    if (await checkRateLimitDB(supabase, `gen-plan:${user.id}`, RATE_LIMIT_GEN_PLAN)) {
      return jsonResponse(
        { error: "Trop de générations récentes. Réessayez dans une heure." },
        429,
        corsHeaders,
      );
    }

    // 4. Vérifier ownership du projet
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return jsonResponse({ error: "Projet introuvable" }, 404, corsHeaders);
    }

    if (project.owner_id !== user.id) {
      return jsonResponse({ error: "Accès refusé à ce projet" }, 403, corsHeaders);
    }

    // 5. Vérifier quota cumulé sur ce projet
    const { data: existing } = await supabase
      .from("subtopics")
      .select("target_count")
      .eq("project_id", projectId);

    const existingTotal = (existing ?? []).reduce(
      (sum, s: { target_count: number }) => sum + (s.target_count ?? 0),
      0,
    );

    if (existingTotal + totalCount > PROJECT_PHRASE_QUOTA) {
      return jsonResponse(
        {
          error: `Quota dépassé. Ce projet a déjà ${existingTotal} phrases planifiées sur ${PROJECT_PHRASE_QUOTA}.`,
        },
        400,
        corsHeaders,
      );
    }

    // 6. Appel Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY manquante");
      return jsonResponse({ error: "Configuration serveur manquante" }, 500, corsHeaders);
    }

    let subtopics: GeminiSubtopic[];
    try {
      subtopics = await callGeminiPlan(apiKey, theme, language, totalCount);
    } catch (e) {
      const msg = (e as Error).message;
      console.error("callGeminiPlan failed:", msg);
      return jsonResponse(
        { error: "Impossible de générer le plan. Réessayez ou ajustez votre thème." },
        502,
        corsHeaders,
      );
    }

    // 7. Récupère la position max actuelle pour insérer à la suite
    const { data: maxRow } = await supabase
      .from("subtopics")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startPosition = (maxRow?.position ?? 0) + 1;

    // 8. INSERT en batch
    const rows = subtopics.map((s, i) => ({
      project_id: projectId,
      position: startPosition + i,
      title: s.title,
      description: s.description,
      target_count: s.target_count,
      source: "ai" as const,
      status: "pending" as const,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("subtopics")
      .insert(rows)
      .select("id, position, title, description, target_count, status, source");

    if (insertError) {
      console.error("Insert subtopics failed:", insertError);
      return jsonResponse(
        { error: "Erreur lors de l'enregistrement du plan" },
        500,
        corsHeaders,
      );
    }

    return jsonResponse(
      {
        data: {
          subtopics: inserted,
          total_planned: subtopics.reduce((s, x) => s + x.target_count, 0),
        },
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("generate-subtopics-plan error:", err);
    return jsonResponse({ error: "Erreur interne du serveur" }, 500, corsHeaders);
  }
});
