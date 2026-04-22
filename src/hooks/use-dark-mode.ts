/**
 * Dark mode natif Linear-style : tout le produit est en dark, sans toggle.
 * Ce hook reste exposé pour éviter de casser les imports existants.
 * Les consommateurs peuvent ignorer `toggle` (no-op).
 */
export function useDarkMode() {
  return {
    isDark: true,
    toggle: () => { /* no-op, tout est dark */ },
  }
}
