"use client";

import { useState } from "react";
import { Icon } from "./Icons";

// Envoi manuel d'une notification push a tous les abonnes (voir
// app/api/admin/notifications/send et lib/webpush.ts). Independant des
// envois automatiques (nouvelle sortie / sortie modifiee) declenches depuis
// les routes de creation/edition de sortie.
export function AdminNotificationComposer() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function send() {
    if (!message.trim()) {
      setFeedback({ type: "error", text: "Écris un message avant d'envoyer." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Échec de l'envoi.");

      setFeedback({ type: "ok", text: "Notification envoyée ✓" });
      setTitle("");
      setMessage("");
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Une erreur est survenue." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 dark:border-white/10 dark:bg-[#1A1422]">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (optionnel, par défaut « SPS »)"
        maxLength={60}
        className="rounded-xl border border-black/[0.08] bg-transparent px-3 py-2 text-[13px] font-semibold outline-none dark:border-white/10"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message à envoyer à tous les abonnés…"
        rows={3}
        maxLength={300}
        className="resize-none rounded-xl border border-black/[0.08] bg-transparent px-3 py-2 text-[13px] outline-none dark:border-white/10"
      />

      {feedback && (
        <p className={`text-[11.5px] font-semibold ${feedback.type === "ok" ? "text-sps-green" : "text-sps-red"}`}>
          {feedback.text}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={send}
        className="flex items-center justify-center gap-2 rounded-xl bg-sps-violet600 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
      >
        <Icon name="send" size={15} />
        Envoyer à tous les abonnés
      </button>
    </div>
  );
}
