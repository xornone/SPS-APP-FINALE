"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

interface PreviewData {
  preview: {
    title: string;
    body: string;
    url: string;
  } | null;
  ride: {
    id: string;
    title: string;
    date: string;
    time: string;
    place: string;
  } | null;
}

export function AdminRideReminderCard() {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function loadPreview() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/rides/send-reminder");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPreview();
  }, []);

  async function handleSend() {
    if (!data?.ride?.id) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/rides/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: data.ride.id }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Échec de l'envoi");

      setFeedback({
        type: "ok",
        text: "Rappel veille de sortie envoyé avec succès à tous les abonnés ✓",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors de l'envoi",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300">
            <Icon name="bell" size={17} />
          </span>
          <div>
            <h3 className="font-display text-[14px] font-bold tracking-wide text-black dark:text-white">
              Rappels veille de sortie ⏰
            </h3>
            <p className="text-[11px] text-black/45 dark:text-white/45">
              Notification push la veille au soir avec météo et point de départ
            </p>
          </div>
        </div>
        <span className="rounded-full bg-sps-violet600/10 px-2 py-0.5 text-[10px] font-bold text-sps-violet600 dark:text-sps-violet400">
          Auto 19h
        </span>
      </div>

      {loading ? (
        <p className="py-2 text-[12px] text-black/40 dark:text-white/40">Chargement de la prochaine sortie…</p>
      ) : !data?.preview ? (
        <p className="py-1 text-[12px] text-black/45 dark:text-white/45">
          Aucune sortie programmée pour le moment.
        </p>
      ) : (
        <div className="mt-1 space-y-2">
          {/* Aperçu de la notification */}
          <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
              Aperçu du message pour « {data.ride?.title} »
            </p>
            <p className="mt-1 font-display text-[13px] font-bold text-black dark:text-white">
              {data.preview.title}
            </p>
            <p className="text-[12px] text-black/70 dark:text-white/70 leading-snug">
              {data.preview.body}
            </p>
          </div>

          {feedback && (
            <p
              className={`rounded-xl p-2.5 text-[11.5px] font-semibold leading-snug ${
                feedback.type === "ok" ? "bg-sps-green/10 text-sps-green" : "bg-sps-red/10 text-sps-red"
              }`}
            >
              {feedback.text}
            </p>
          )}

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              disabled={sending}
              onClick={handleSend}
              className="flex items-center gap-1.5 rounded-xl bg-sps-violet600 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-sps-violet700 active:scale-95 disabled:opacity-50"
            >
              <Icon name="send" size={13} />
              {sending ? "Envoi en cours…" : "Envoyer le rappel maintenant (Test)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
