// CORS helper partagé pour toutes les Edge Functions Baat-IA.
//
// Whitelist d'origines configurée via la variable d'env ALLOWED_ORIGINS
// (séparée par virgules). Si non définie, on autorise uniquement le domaine
// de prod baat-ai.vercel.app + localhost en dev.
//
// Usage :
//   import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts'
//   const cors = buildCorsHeaders(req)
//   if (req.method === 'OPTIONS') return handlePreflight(cors)

const DEFAULT_ALLOWED = [
  'https://baat-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS')
  if (!env) return DEFAULT_ALLOWED
  return env.split(',').map((s) => s.trim()).filter(Boolean)
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = getAllowedOrigins()
  const isAllowed = allowed.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export function handlePreflight(corsHeaders: Record<string, string>): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}
