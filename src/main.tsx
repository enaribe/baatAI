import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'

// Initialisation du thème avant le render pour éviter le flash
const stored = localStorage.getItem('baat-theme')
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
const initialTheme = stored === 'light' || stored === 'dark'
  ? stored
  : prefersLight ? 'light' : 'dark'
document.documentElement.setAttribute('data-theme', initialTheme)
// On garde aussi la classe .dark pour la compatibilité avec les variantes Tailwind `dark:*`
if (initialTheme === 'dark') document.documentElement.classList.add('dark')
else document.documentElement.classList.remove('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
