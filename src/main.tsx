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

// Auto-reload quand un chunk dynamic import devient introuvable après un déploiement.
// Vite génère des fichiers avec des hashes (ex: browser-BbFANBVS.js). Quand on déploie
// une nouvelle version, les anciens chunks n'existent plus et un onglet ouvert qui
// tente d'importer un chunk dynamique tombe sur un 404. On détecte le cas et on
// recharge la page une seule fois (sessionStorage flag pour éviter une boucle infinie).
const RELOAD_FLAG = 'baat-chunk-reload'
function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(msg)
}
window.addEventListener('error', (event) => {
  if (isChunkLoadError(event.error ?? event.message)) {
    if (sessionStorage.getItem(RELOAD_FLAG) !== '1') {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  }
})
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkLoadError(event.reason)) {
    if (sessionStorage.getItem(RELOAD_FLAG) !== '1') {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  }
})
// Reset du flag après un boot réussi
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
