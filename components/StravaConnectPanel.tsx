"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { StravaConnection } from "@/lib/strava";

// Chaque admin ne voit et ne gere que SA propre connexion Strava (jamais
// celle des autres admins) : pas de liste, un seul etat connecte/deconnecte.
export function StravaConnectPanel({ connection }: { connection: StravaConnection | null }) {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("strava_connected");
  const hadError = searchParams.get("strava_error");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(connection);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/admin/strava/disconnect", { method: "POST" });
      setCurrent(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {justConnected && (
        <p className="rounded-xl bg-sps-green/10 px-3 py-2 text-xs font-semibold text-sps-green">
          Strava connecté pour {justConnected} ✓
        </p>
      )}
      {hadError && (
        <p className="rounded-xl bg-sps-red/10 px-3 py-2 text-xs font-semibold text-sps-red">
          La connexion Strava a échoué : {hadError}
        </p>
      )}
      {current ? (
        <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-[#1A1422]">
          <span className="text-sm font-medium">{current.athleteName}</span>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-sps-green">Connecté ✓</span>
            <button
              type="button"
              disabled={busy}
              onClick={disconnect}
              className="text-xs text-black/40 underline disabled:opacity-50 dark:text-white/40"
            >
              Déconnecter
            </button>
          </div>
        </div>
      ) : (
        <a
          href="/api/admin/strava/connect"
          className="flex items-center justify-center rounded-2xl border-[1.5px] border-dashed border-black/15 px-3.5 py-2.5 text-sm font-semibold text-sps-violet600 dark:border-white/15 dark:text-sps-violet400"
        >
          + Connecter à Strava
        </a>
      )}
    </div>
  );
}
