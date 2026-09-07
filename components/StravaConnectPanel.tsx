"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function StravaConnectPanel({
  admins,
  connected,
}: {
  admins: string[];
  connected: Record<string, boolean>;
}) {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("strava_connected");
  const hadError = searchParams.get("strava_error");
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState(connected);

  async function disconnect(name: string) {
    setBusy(name);
    try {
      await fetch("/api/admin2test/strava/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: name }),
      });
      setState((prev) => ({ ...prev, [name]: false }));
    } finally {
      setBusy(null);
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
          La connexion Strava a échoué, réessaie.
        </p>
      )}
      {admins.map((name) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-[#1A1422]"
        >
          <span className="text-sm font-medium">{name}</span>
          {state[name] ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-sps-green">Connecté ✓</span>
              <button
                type="button"
                disabled={busy === name}
                onClick={() => disconnect(name)}
                className="text-xs text-black/40 underline disabled:opacity-50 dark:text-white/40"
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <a
              href={`/api/admin2test/strava/connect?admin=${encodeURIComponent(name)}`}
              className="rounded-lg bg-sps-violet600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Connecter Strava
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
