"use client";

import { useEffect, useRef } from "react";
import { useIsAdmin } from "@/lib/useIsAdmin";

/**
 * Synchronise silencieusement l'abonnement push du navigateur des administrateurs
 * connectes. Des qu'un admin navigue dans l'application avec un appareil ayant
 * autorise les notifications, son abonnement est marque is_admin = true dans
 * Supabase pour lui adresser les notifications ciblees (nouvelles idees, etc.).
 */
export function AdminPushSync() {
  const isAdmin = useIsAdmin();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || hasSyncedRef.current) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    let cancelled = false;

    async function syncSubscription() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub || cancelled) return;

        // Envoi au serveur pour mise a jour is_admin: true
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });

        hasSyncedRef.current = true;
      } catch {
        // Silencieux
      }
    }

    syncSubscription();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return null;
}
