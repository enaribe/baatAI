import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return handlePreflight(corsHeaders);

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

    // 2b. Validation du fichier : type MIME + taille max
    // Limites : 10 MB, et seulement les formats parsés par le serveur Python
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_MIME = new Set([
      "text/plain",
      "text/csv",
      "application/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc (rarement utilisé mais accepté)
    ]);
    const ALLOWED_EXT = /\.(txt|csv|pdf|docx?|md)$/i;

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / (1024 * 1024)} MB)` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mimeOk = ALLOWED_MIME.has(file.type) || file.type === "" || file.type === "application/octet-stream";
    const extOk = ALLOWED_EXT.test(file.name);
    if (!mimeOk || !extOk) {
      return new Response(
        JSON.stringify({ error: "Format non supporté. Formats acceptés : .txt, .csv, .pdf, .docx" }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
