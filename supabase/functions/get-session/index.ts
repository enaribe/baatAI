import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // CORS preflight
  if (req.method === "OPTIONS") return handlePreflight(corsHeaders);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Paramètre token requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Find session by token
    const { data: session, error: sessionError } = await supabase
      .from("recording_sessions")
      .select("id, project_id, speaker_name, speaker_metadata, status, total_recorded, expires_at")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Session expirée" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch phrases for the project
    const { data: phrases, error: phrasesError } = await supabase
      .from("phrases")
      .select("id, project_id, position, content, normalized_content")
      .eq("project_id", session.project_id)
      .order("position");

    if (phrasesError) {
      console.error("Phrases fetch error:", phrasesError);
      return new Response(
        JSON.stringify({ error: "Erreur lors du chargement des phrases" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fetch already-recorded phrase IDs for this session
    const { data: recordings, error: recordingsError } = await supabase
      .from("recordings")
      .select("phrase_id")
      .eq("session_id", session.id);

    if (recordingsError) {
      console.error("Recordings fetch error:", recordingsError);
      return new Response(
        JSON.stringify({ error: "Erreur lors du chargement des enregistrements" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const recordedPhraseIds = (recordings ?? []).map((r: { phrase_id: string }) => r.phrase_id);

    // 4. Generate a TUS upload URL (storage endpoint)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`;

    // 5. Update session status to active if pending
    if (session.status === "pending") {
      await supabase
        .from("recording_sessions")
        .update({ status: "active" })
        .eq("id", session.id);
    }

    return new Response(
      JSON.stringify({
        data: {
          session: {
            id: session.id,
            project_id: session.project_id,
            speaker_name: session.speaker_name,
            status: session.status === "pending" ? "active" : session.status,
          },
          phrases: phrases ?? [],
          recorded_phrase_ids: recordedPhraseIds,
          upload_url: uploadUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-session error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
