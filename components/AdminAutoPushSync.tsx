"use client";

import { useEffect } from "react";

/**
 * Synchronise automatiquement l'appareil de l'administrateur connecté
 * pour qu'il reçoive les notifications de la boîte à idées de manière 100%
 * silencieuse et automatique, sans aucun bouton ni interface manuelle.
 */
export function AdminAutoPushSync() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub),
            });
          }
        } catch {
          // Échec silencieux
        }
      });
    }
  }, []);

  return null;
}
