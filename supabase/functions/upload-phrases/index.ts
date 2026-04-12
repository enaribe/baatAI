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
    // JWT explicite : avec service_role, getUser() sans argument n'utilise pas toujours le header Authorization
    const authHeader = req.headers.get("Authorization");
    const jwtMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    const jwt = jwtMatch?.[1];
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client avec anon key pour valider le JWT utilisateur (nécessaire pour ES256)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      },
    );

    // Client service_role pour les opérations admin (lecture/écriture sans RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 1. Vérifier l'utilisateur connecté via le client anon (compatible ES256)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
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
