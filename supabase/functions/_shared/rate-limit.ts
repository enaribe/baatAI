// Rate limiter en mémoire pour les Edge Functions Baat-IA.
//
// Approche simple : Map<key, [timestamp[]]>, fenêtre glissante.
// La mémoire est partagée par worker Deno (pas de Redis), ce qui est
// suffisant à l'échelle actuelle. À remplacer par un vrai store
// distribué (Upstash Redis, Deno KV) si on déploie multi-région.
//
// Usage :
//   import { checkRateLimit } from '../_shared/rate-limit.ts'
//   const limited = checkRateLimit(`withdraw:${user.id}`, { max: 3, windowSec: 3600 })
//   if (limited) return json({ error: 'Trop de requêtes' }, 429)

interface RateLimitOptions {
  /** Nombre max de requêtes dans la fenêtre */
  max: number
  /** Fenêtre en secondes */
  windowSec: number
}

const store = new Map<string, number[]>()

/**
 * Retourne true si la limite est dépassée (la requête doit être rejetée).
 * Retourne false si la requête peut passer (et l'enregistre dans le compteur).
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now()
  const windowMs = opts.windowSec * 1000
  const cutoff = now - windowMs

  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff)

  if (timestamps.length >= opts.max) {
    store.set(key, timestamps)
    return true
  }

  timestamps.push(now)
  store.set(key, timestamps)

  // Cleanup périodique pour éviter une croissance infinie de la Map
  if (store.size > 10000 && Math.random() < 0.01) {
    for (const [k, ts] of store.entries()) {
      const filtered = ts.filter((t) => t > now - 86400000) // 24h
      if (filtered.length === 0) store.delete(k)
      else store.set(k, filtered)
    }
  }

  return false
}
