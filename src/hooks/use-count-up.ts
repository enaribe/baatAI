import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number>(0)

  useEffect(() => {
    if (target === 0) {
      setValue(0)
      return
    }

    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId.current)
  }, [target, duration])

  return value
}
