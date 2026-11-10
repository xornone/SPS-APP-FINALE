"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { AdminOnly } from "./AdminOnly";

interface AdminStravaSyncButtonProps {
  className?: string;
  onSyncComplete?: () => void;
  months?: string[];
}

export function AdminStravaSyncButton({ className = "", onSyncComplete, months }: AdminStravaSyncButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSync() {
    if (status === "loading") return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/strava/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Erreur lors de la synchronisation");
      }

      setStatus("success");
      if (onSyncComplete) onSyncComplete();
      router.refresh();

      setTimeout(() => {
        setStatus("idle");
      }, 4000);
    } catch (err: unknown) {
      console.error("[AdminStravaSyncButton] Erreur :", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Échec de synchronisation");
      setTimeout(() => {
        setStatus("idle");
      }, 5000);
    }
  }

  return (
    <AdminOnly>
      <div className={`flex flex-col items-end gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleSync}
          disabled={status === "loading"}
          className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black tracking-wide transition-all shadow-xs ${
            status === "loading"
              ? "cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-white/10 dark:text-white/40"
              : status === "success"
              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-400/20 dark:text-emerald-300"
              : status === "error"
              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:bg-rose-400/20 dark:text-rose-300"
              : "border border-[#FC5200]/30 bg-[#FC5200]/10 text-[#FC5200] hover:bg-[#FC5200]/20 active:scale-95 dark:border-[#FC5200]/40 dark:bg-[#FC5200]/15 dark:text-[#FC5200]"
          }`}
          title="Synchroniser les kilomètres et D+ des 99 membres SPS depuis Strava"
        >
          {status === "loading" ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Synchro Strava en cours...</span>
            </>
          ) : status === "success" ? (
            <>
              <span className="text-sm">✓</span>
              <span>Strava synchronisé !</span>
            </>
          ) : status === "error" ? (
            <>
              <span className="text-sm">⚠️</span>
              <span>Erreur synchro</span>
            </>
          ) : (
            <>
              <span className="text-[13px] leading-none">⚡</span>
              <span>Synchroniser Strava</span>
            </>
          )}
        </button>

        {errorMessage && (
          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">
            {errorMessage}
          </span>
        )}
      </div>
    </AdminOnly>
  );
}
