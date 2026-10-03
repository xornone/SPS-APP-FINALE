"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const DISMISSED_KEY = "sps_push_dismissed";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  // Le typage DOM de PushManager#subscribe veut un ArrayBuffer precisement
  // (pas ArrayBufferLike) : TS 5.6 distingue desormais les deux, d'ou le
  // detour par .buffer plutot que de retourner le Uint8Array directement.
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as BufferSource;
}

type Status = "checking" | "unsupported" | "denied" | "off" | "on" | "dismissed";

/**
 * Bandeau d'activation des notifications push, affiche sur l'Accueil.
 * Aucun compte requis : l'abonnement est identifie par son endpoint
 * navigateur (voir app/api/push/subscribe). Masque automatiquement si le
 * navigateur ne supporte pas le Push API (Safari iOS hors PWA installee —
 * voir le service worker public/sw.js), si la permission a ete refusee
 * (impossible de redemander depuis la page), ou si deja active/ferme par
 * l'utilisateur (localStorage, par navigateur uniquement — pas de compte
 * pour synchroniser cet etat autrement).
 */
export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) {
          setStatus("on");
          return;
        }
      } catch {
        // Enregistrement du service worker impossible (contexte non
        // securise, etc.) : on se rabat sur l'etat "off" plutot que de
        // planter le bandeau, l'activation re-tentera l'enregistrement.
      }
      if (cancelled) return;
      setStatus(window.localStorage.getItem(DISMISSED_KEY) === "1" ? "dismissed" : "off");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Notifications pas encore configurées côté serveur.");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement de l'abonnement.");

      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setStatus("dismissed");
  }

  if (status === "checking" || status === "unsupported" || status === "denied" || status === "dismissed" || status === "on") {
    return null;
  }

  return (
    <div className="mx-5 mb-4 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sps-violet600/10 text-sps-violet600 dark:text-sps-violet400">
        <Icon name="bell" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold">Activer les notifications</p>
        <p className="text-[11.5px] text-black/45 dark:text-white/45">
          Sois prévenu(e) des nouvelles sorties et des changements.
        </p>
        {error && <p className="mt-1 text-[11px] font-semibold text-sps-red">{error}</p>}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={enable}
        className="flex-none rounded-xl bg-sps-violet600 px-3 py-2 text-[12px] font-extrabold text-white disabled:opacity-50"
      >
        Activer
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ignorer"
        className="flex-none text-black/30 dark:text-white/30"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
