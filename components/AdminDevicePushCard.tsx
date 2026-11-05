"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as BufferSource;
}

export function AdminDevicePushCard() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null);

  async function checkStatus() {
    if (typeof window === "undefined") return;
    const isSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setHasSubscription(!!sub);
      } else {
        setHasSubscription(false);
      }
    } catch {
      setHasSubscription(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function enableOnDevice() {
    setBusy(true);
    setFeedback(null);
    try {
      if (!supported) {
        throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("L'autorisation de notifications a été refusée dans le navigateur.");
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Clé VAPID publique manquante côté serveur.");
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erreur d'enregistrement.");
      }

      setHasSubscription(true);
      setFeedback({
        type: "ok",
        text: "Cet appareil est maintenant enregistré comme Administrateur ✓ Tu recevras un push dès qu'une idée est soumise.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Échec de l'envoi du test.");
      }
      if (data.warning) {
        setFeedback({ type: "warn", text: data.warning });
      } else {
        setFeedback({
          type: "ok",
          text: data.message || "Notification de test envoyée ✓",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors du test.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
            <Icon name="lightbulb" size={17} />
          </span>
          <div>
            <h3 className="font-display text-[14px] font-bold tracking-wide text-black dark:text-white">
              Alertes Boîte à idées 💡
            </h3>
            <p className="text-[11px] text-black/45 dark:text-white/45">
              Recevoir un push administrateur pour chaque nouvelle suggestion
            </p>
          </div>
        </div>

        {hasSubscription && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sps-green/10 px-2.5 py-0.5 text-[10.5px] font-bold text-sps-green">
            Actif ✓
          </span>
        )}
      </div>

      {supported === false && (
        <div className="mt-1 rounded-xl bg-amber-500/10 p-2.5 text-[11.5px] text-amber-900 dark:text-amber-200">
          <p className="font-semibold">📱 Sur iPhone / iPad :</p>
          <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
            Pour recevoir les notifications sur iOS, ouvre le site dans Safari, touche l&apos;icône <b>Partager</b> (carré avec flèche vers le haut), choisis <b>« Sur l&apos;écran d&apos;accueil »</b>, puis ouvre l&apos;appli depuis cette nouvelle icône.
          </p>
        </div>
      )}

      {supported && permission === "denied" && (
        <p className="rounded-xl bg-sps-red/10 p-2.5 text-[11.5px] font-medium text-sps-red">
          🚫 Les notifications sont bloquées dans les réglages de ton navigateur. Débloque-les pour recevoir les alertes.
        </p>
      )}

      {feedback && (
        <p
          className={`rounded-xl p-2.5 text-[11.5px] font-semibold leading-snug ${
            feedback.type === "ok"
              ? "bg-sps-green/10 text-sps-green"
              : feedback.type === "warn"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "bg-sps-red/10 text-sps-red"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        {supported && !hasSubscription && (
          <button
            type="button"
            disabled={busy}
            onClick={enableOnDevice}
            className="flex items-center gap-1.5 rounded-xl bg-sps-violet600 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-sps-violet700 active:scale-95 disabled:opacity-50"
          >
            <Icon name="bell" size={13} />
            Activer les alertes sur cet appareil
          </button>
        )}

        {supported && hasSubscription && (
          <button
            type="button"
            disabled={busy}
            onClick={testNotification}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2 text-[12px] font-semibold text-black transition hover:bg-black/[0.06] active:scale-95 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
          >
            <Icon name="send" size={12} />
            Envoyer une notification de test
          </button>
        )}
      </div>
    </div>
  );
}
