import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // CORS preflight
  if (req.method === "OPTIONS") return handlePreflight(corsHeaders);

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { session_token, session_id, phrase_id, storage_path } = body;

    if ((!session_token && !session_id) || !phrase_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: "Champs requis : (session_token ou session_id), phrase_id, storage_path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 0. Si la requête est en mode "speaker authentifié" (session_id fourni),
    //    on EXIGE un Bearer token valide et on vérifie que l'user authentifié
    //    correspond bien au speaker_id de la session. Le mode legacy anonyme
    //    (session_token) reste accepté pour la compat retro de /record/:token.
    let authenticatedUserId: string | null = null;
    if (session_id) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!jwt) {
        return new Response(
          JSON.stringify({ error: "Authentification requise" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Token invalide" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      authenticatedUserId = userData.user.id;
    }

    // 1. Validate session (par token ou par id selon ce qui est fourni)
    const sessionQuery = supabase
      .from("recording_sessions")
      .select("id, project_id, speaker_id, status, expires_at, total_recorded");

    const { data: session, error: sessionError } = session_id
      ? await sessionQuery.eq("id", session_id).single()
      : await sessionQuery.eq("token", session_token).single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1b. Vérifier que l'utilisateur authentifié est bien le propriétaire de la session
    if (session_id && authenticatedUserId && session.speaker_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Session expirée" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // 2. Validate that phrase belongs to the project
    const { data: phrase, error: phraseError } = await supabase
      .from("phrases")
      .select("id")
      .eq("id", phrase_id)
      .eq("project_id", session.project_id)
      .single();

    if (phraseError || !phrase) {
      return new Response(
        JSON.stringify({ error: "Phrase invalide pour ce projet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Check for existing recording (same session + phrase) → delete it to allow redo
    const { data: existing } = await supabase
      .from("recordings")
      .select("id")
      .eq("session_id", session.id)
      .eq("phrase_id", phrase_id)
      .maybeSingle();

    let isRedo = false;
    if (existing) {
      // Delete the old recording to allow re-recording
      await supabase.from("recordings").delete().eq("id", existing.id);
      isRedo = true;
    }

    // 4. Insert recording (via service_role, bypasses RLS)
    const { data: recording, error: insertError } = await supabase
      .from("recordings")
      .insert({
        session_id: session.id,
        project_id: session.project_id,
        phrase_id: phrase_id,
        raw_storage_path: storage_path,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert recording error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'enregistrement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Update session total_recorded count (only increment if not a redo)
    if (!isRedo) {
      await supabase
        .from("recording_sessions")
        .update({ total_recorded: session.total_recorded + 1 })
        .eq("id", session.id);
    }

    // 6. Check if all phrases are recorded → mark session completed
    const { count: totalPhrases } = await supabase
      .from("phrases")
      .select("id", { count: "exact", head: true })
      .eq("project_id", session.project_id);

    const newTotal = isRedo ? session.total_recorded : session.total_recorded + 1;
    if (totalPhrases && newTotal >= totalPhrases) {
      await supabase
        .from("recording_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);
    }

    return new Response(
      JSON.stringify({
        data: {
          recording_id: recording.id,
          total_recorded: newTotal,
          is_redo: isRedo,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("submit-recording error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
