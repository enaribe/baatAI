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
    // 1. Vérifier le JWT Supabase de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token d'authentification requis" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // On utilise le service_role key mais on passe le JWT user via getUser(jwt)
    // pour valider que le token est bien émis par Supabase Auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Lire le body multipart
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Content-Type multipart/form-data requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // 4. Forwarder le fichier au serveur Python
    const pythonServerUrl = Deno.env.get("PYTHON_SERVER_URL");
    const apiSecret = Deno.env.get("PYTHON_API_SECRET");

    if (!pythonServerUrl || !apiSecret) {
      console.error("Variables d'environnement manquantes : PYTHON_SERVER_URL ou PYTHON_API_SECRET");
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
      headers: {
        Authorization: `Bearer ${apiSecret}`,
      },
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
