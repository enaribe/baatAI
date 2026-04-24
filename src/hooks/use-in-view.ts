import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Pourcentage de l'élément visible avant de déclencher (0-1). Défaut: 0.1 */
  threshold?: number
  /** Marge autour du viewport (rootMargin). Défaut: "0px 0px -10% 0px" (déclenche un peu avant le bas). */
  rootMargin?: string
  /** Si true, l'animation se déclenche une seule fois. Défaut: true. */
  once?: boolean
}

/**
 * Hook qui détecte quand un élément entre dans le viewport.
 * Utilisé pour déclencher des animations au scroll.
 *
 * Usage :
 *   const { ref, inView } = useInView()
 *   <div ref={ref} className={inView ? 'animate-fade-in-up' : 'opacity-0'}>...</div>
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(options: UseInViewOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -10% 0px', once = true } = options
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // SSR/old browsers fallback : marquer immédiatement comme visible
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, inView }
}
