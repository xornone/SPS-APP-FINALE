"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GROUP_INFO, type GroupLevel, type Participation } from "@/lib/types";
import { Icon } from "./Icons";
import { clearMyParticipation, getLastUsedName, getMyParticipation, setMyParticipation } from "@/lib/myParticipations";

export function JoinPanel({
  rideId,
  availableGroups,
  isPast,
  participants,
}: {
  rideId: string;
  availableGroups: GroupLevel[];
  isPast: boolean;
  /** Liste actuelle des participants (rendue cote serveur), pour verifier que
   * "mon" inscription (retrouvee en localStorage) existe toujours. */
  participants: Participation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<ReturnType<typeof getMyParticipation>>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<GroupLevel>(availableGroups[0]);

  useEffect(() => {
    const stored = getMyParticipation(rideId);
    if (stored && participants.some((p) => p.id === stored.id)) {
      setMine(stored);
    } else if (stored) {
      // L'inscription a ete retiree (par l'admin, ou depuis un autre appareil)
      clearMyParticipation(rideId);
      setMine(null);
    }
    setName(getLastUsedName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, participants.length]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Indique ton nom pour t'inscrire.");
      return;
    }
    setError("");
    setPending(true);
    const res = await fetch("/api/participations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ride_id: rideId, participant_name: trimmed, group_level: group }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    const record = { id: data.id, client_token: data.client_token, participant_name: trimmed, group_level: group };
    setMyParticipation(rideId, record);
    setMine(record);
    router.refresh();
  }

  async function handleLeave() {
    if (!mine) return;
    setPending(true);
    const res = await fetch(`/api/participations/${mine.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_token: mine.client_token }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Impossible de retirer ta participation.");
      return;
    }
    clearMyParticipation(rideId);
    setMine(null);
    router.refresh();
  }

  async function handleChangeGroup(g: GroupLevel) {
    if (!mine || g === mine.group_level) return;
    setPending(true);
    const res = await fetch(`/api/participations/${mine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_token: mine.client_token, group_level: g }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Impossible de changer de groupe.");
      return;
    }
    const updated = { ...mine, group_level: g };
    setMyParticipation(rideId, updated);
    setMine(updated);
    router.refresh();
  }

  if (isPast) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black/[0.04] px-4 py-3.5 text-sm font-extrabold text-black/40 dark:bg-white/5 dark:text-white/40"
      >
        <Icon name="check" size={16} /> Sortie terminée
      </button>
    );
  }

  if (mine) {
    return (
      <div className="flex flex-col gap-3.5">
        <button
          disabled={pending}
          onClick={handleLeave}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"
        >
          <Icon name="check" size={16} /> Inscrit{mine.participant_name ? ` (${mine.participant_name})` : ""} ✓ · toucher pour annuler
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-black/35 dark:text-white/35">
            Je roulerai avec :
          </p>
          <div className="flex gap-2">
            {availableGroups.map((g) => {
              const info = GROUP_INFO[g];
              const selected = mine.group_level === g;
              return (
                <button
                  key={g}
                  disabled={pending}
                  onClick={() => handleChangeGroup(g)}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2.5 text-[11px] font-extrabold disabled:opacity-60"
                  style={{
                    color: info.hex,
                    borderColor: selected ? info.hex : "rgba(0,0,0,.08)",
                    background: selected ? `${info.hex}1A` : "transparent",
                  }}
                >
                  <b className="text-[12.5px]">{info.label}</b>
                  {info.range}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-3.5">
      <div>
        <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-black/35 dark:text-white/35">
          Ton nom
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prénom Nom"
          maxLength={60}
          className="w-full rounded-xl border-[1.5px] border-black/10 bg-white px-3.5 py-3 text-sm dark:border-white/15 dark:bg-[#1A1422]"
        />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-black/35 dark:text-white/35">
          Je roulerai avec :
        </p>
        <div className="flex gap-2">
          {availableGroups.map((g) => {
            const info = GROUP_INFO[g];
            const selected = group === g;
            return (
              <button
                type="button"
                key={g}
                onClick={() => setGroup(g)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2.5 text-[11px] font-extrabold"
                style={{
                  color: info.hex,
                  borderColor: selected ? info.hex : "rgba(0,0,0,.08)",
                  background: selected ? `${info.hex}1A` : "transparent",
                }}
              >
                <b className="text-[12.5px]">{info.label}</b>
                {info.range}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"
      >
        {pending ? "Inscription…" : "Je participe"}
      </button>
    </form>
  );
}
