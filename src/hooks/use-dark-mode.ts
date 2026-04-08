import { useState, useEffect, useCallback } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('baat-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('baat-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark((prev) => !prev), [])

  return { isDark, toggle }
}
