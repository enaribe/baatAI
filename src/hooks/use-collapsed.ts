import { useState, useCallback, useEffect } from 'react'

/**
 * Persiste un état booléen "plié/déplié" dans localStorage.
 * La key est partagée entre tous les composants qui l'utilisent
 * (ex : `subtopics:${projectId}:section`).
 *
 * Si localStorage est indisponible (mode privé strict), fallback sur l'état initial.
 */
export function useCollapsed(key: string, defaultCollapsed: boolean): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === 'true' || stored === 'false') return stored === 'true'
    } catch {
      // localStorage indisponible
    }
    return defaultCollapsed
  })

  // Si la key change (ex : changement de projet), recharger depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === 'true' || stored === 'false') {
        setCollapsed(stored === 'true')
      } else {
        setCollapsed(defaultCollapsed)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(key, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [key])

  return [collapsed, toggle]
}
