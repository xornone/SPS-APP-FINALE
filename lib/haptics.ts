/**
 * Retours haptiques subtils pour les appareils mobiles.
 * Améliore la sensation tactile (clics d'onglets, participation, actions rapides).
 * Sans aucun impact sur les navigateurs de bureau ou non compatibles.
 */
export function hapticTap(durationMs = 8): void {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignorer silencieusement
    }
  }
}

export function hapticSuccess(): void {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([10, 30, 15]);
    } catch {
      // Ignorer silencieusement
    }
  }
}

export function hapticWarning(): void {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([20, 40, 20]);
    } catch {
      // Ignorer silencieusement
    }
  }
}
