import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { session_token, phrase_id, storage_path } = body;

    if (!session_token || !phrase_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: "Champs requis : session_token, phrase_id, storage_path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Validate session token
    const { data: session, error: sessionError } = await supabase
      .from("recording_sessions")
      .select("id, project_id, status, expires_at, total_recorded")
      .eq("token", session_token)
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
