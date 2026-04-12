import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
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
    // Pattern officiel Supabase : le client lit le JWT depuis les headers de la requête
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    // 1. Vérifier l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Lire le body multipart
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("project_id") as string | null;
    const startPosition = formData.get("start_position") as string | null;

    if (!file || !projectId) {
      return new Response(
        JSON.stringify({ error: "Champs requis : file, project_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Vérifier que le projet appartient bien à l'utilisateur
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Projet introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (project.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé à ce projet" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Forwarder au serveur Python
    const pythonServerUrl = Deno.env.get("PYTHON_SERVER_URL");
    const apiSecret = Deno.env.get("PYTHON_API_SECRET");

    if (!pythonServerUrl || !apiSecret) {
      console.error("Variables manquantes : PYTHON_SERVER_URL ou PYTHON_API_SECRET");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const forwardForm = new FormData();
    forwardForm.append("file", file);
    forwardForm.append("project_id", projectId);
    if (startPosition) forwardForm.append("start_position", startPosition);

    const pythonResponse = await fetch(`${pythonServerUrl}/api/upload-phrases`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiSecret}` },
      body: forwardForm,
    });

    const pythonData = await pythonResponse.json();

    if (!pythonResponse.ok) {
      console.error("Python server error:", pythonData);
      return new Response(
        JSON.stringify({ error: pythonData.error ?? "Erreur du serveur de traitement" }),
        { status: pythonResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ data: pythonData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("upload-phrases error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
