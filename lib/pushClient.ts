"use client";

/**
 * Synchronise en arrière-plan le nom du membre avec l'abonnement push de son appareil.
 * Permet au serveur de cibler les rappels veille de sortie spécifiquement pour le groupe
 * auquel le membre est inscrit.
 */
export async function syncPushSubscriptionName(participantName: string): Promise<void> {
  if (!participantName || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sub.toJSON(),
        participant_name: participantName.trim(),
      }),
    });
  } catch {
    // Silencieux : best-effort
  }
}
