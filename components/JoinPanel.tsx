"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GROUP_INFO, type GroupLevel, type Participation } from "@/lib/types";
import { Icon } from "./Icons";
import { Avatar } from "./Avatar";
import { clearMyParticipation, getLastUsedName, getMyParticipation, setMyParticipation } from "@/lib/myParticipations";

export function JoinPanel({
  rideId,
  availableGroups,
  isPast,
  participants,
  onJoin,
  onLeave,
  onChangeGroup,
}: {
  rideId: string;
  availableGroups: GroupLevel[];
  isPast: boolean;
  /** Liste actuelle des participants (partagee avec le parent, voir
   * RideParticipationSection), pour verifier que "mon" inscription
   * (retrouvee en localStorage) existe toujours. */
  participants: Participation[];
  /** Met a jour immediatement la liste partagee (voir RideParticipationSection)
   * pour que l'inscription apparaisse sans attendre un rechargement serveur. */
  onJoin?: (p: Participation) => void;
  onLeave?: (id: string) => void;
  onChangeGroup?: (id: string, group: GroupLevel) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<ReturnType<typeof getMyParticipation>>(null);
  const [conflict, setConflict] = useState<{ id: string; title: string } | null>(null);
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
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setError("Indique ton prénom et ton nom pour t'inscrire.");
      return;
    }
    // Prenom + nom obligatoires (pas juste un prenom) pour eviter de
    // confondre deux personnes qui partagent le meme prenom.
    if (trimmed.split(" ").length < 2) {
      setError("Indique ton prénom ET ton nom (ex. « Paul Seixas »).");
      return;
    }
    setError("");
    setConflict(null);
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
      if (data.conflicting_ride_id) {
        setConflict({
          id: data.conflicting_ride_id,
          title: data.conflicting_ride_title || "l'autre sortie",
        });
      }
      return;
    }
    const record = { id: data.id, client_token: data.client_token, participant_name: trimmed, group_level: group };
    setMyParticipation(rideId, record);
    setMine(record);
    onJoin?.({
      id: data.id,
      ride_id: rideId,
      participant_name: trimmed,
      group_level: group,
      created_at: new Date().toISOString(),
    });
    router.refresh();
  }

  async function handleTransfer() {
    if (!conflict) return;
    const storedConflict = getMyParticipation(conflict.id);
    if (!storedConflict) return;

    const trimmed = name.trim().replace(/\s+/g, " ");
    setError("");
    setPending(true);

    const res = await fetch("/api/participations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ride_id: rideId,
        participant_name: trimmed,
        group_level: group,
        transfer_from: {
          ride_id: conflict.id,
          client_token: storedConflict.client_token,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Impossible de basculer d'inscription.");
      return;
    }

    clearMyParticipation(conflict.id);
    const record = { id: data.id, client_token: data.client_token, participant_name: trimmed, group_level: group };
    setMyParticipation(rideId, record);
    setMine(record);
    onJoin?.({
      id: data.id,
      ride_id: rideId,
      participant_name: trimmed,
      group_level: group,
      created_at: new Date().toISOString(),
    });
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
    onLeave?.(mine.id);
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
    onChangeGroup?.(mine.id, g);
    router.refresh();
  }

  if (isPast) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 text-center dark:border-white/10 dark:bg-white/5">
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-black/50 dark:text-white/50">
          <Icon name="check" size={16} /> Sortie terminée
        </span>
      </div>
    );
  }

  if (mine) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500/35 bg-white p-5 shadow-card dark:border-emerald-500/30 dark:bg-[#1A1422]">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] pb-3.5 dark:border-white/[0.08]">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Icon name="check" size={14} /> Tu es dans le peloton !
            </span>
            <h4 className="font-display text-2xl tracking-wide uppercase text-black dark:text-white leading-tight mt-0.5">
              {mine.participant_name}
            </h4>
          </div>
          <button
            disabled={pending}
            onClick={handleLeave}
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50 dark:text-red-400"
          >
            {pending ? "Annulation…" : "Annuler"}
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-500 font-semibold">{error}</p>}

        <div className="mt-3.5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
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
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3 py-2.5 text-[12.5px] font-extrabold transition active:scale-[0.98] disabled:opacity-60 ${
                    selected ? "shadow-sm scale-[1.01]" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    color: info.hex,
                    borderColor: selected ? info.hex : "rgba(0,0,0,.08)",
                    background: selected ? `${info.hex}18` : "transparent",
                  }}
                >
                  <span className="flex items-center gap-1 font-black">
                    {selected && <Icon name="check" size={13} />}
                    {info.label}
                  </span>
                  <span className={`text-[11.5px] font-bold ${selected ? "opacity-100" : "opacity-75"}`}>
                    · {info.range}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleJoin}
      className="relative overflow-hidden rounded-2xl border-2 border-sps-violet600/30 bg-white p-5 shadow-card dark:border-sps-violet500/25 dark:bg-[#1A1422]"
    >
      {/* En-tête avec esprit peloton et preuve sociale */}
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] pb-3.5 dark:border-white/[0.08]">
        <div>
          <h3 className="font-display text-2xl tracking-wide uppercase text-black dark:text-white leading-none">
            Rejoins le peloton
          </h3>
          <p className="mt-1 text-xs font-semibold text-black/55 dark:text-white/55">
            {participants.length === 0
              ? "Sois le premier cycliste au départ !"
              : `${participants.length} cycliste${participants.length > 1 ? "s" : ""} au départ`}
          </p>
        </div>
        {participants.length > 0 && (
          <div className="flex -space-x-2 overflow-hidden py-0.5">
            {participants.slice(0, 4).map((p) => (
              <Avatar
                key={p.id}
                name={p.participant_name}
                seed={p.participant_name}
                size="sm"
                className="ring-2 ring-white dark:ring-[#1A1422] shadow-sm"
              />
            ))}
            {participants.length > 4 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sps-violet600 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#1A1422]">
                +{participants.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3.5">
        {/* Champ Nom */}
        <div>
          <label
            htmlFor="participant-name"
            className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/70 dark:text-white/70"
          >
            Ton prénom et ton nom
          </label>
          <input
            id="participant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex : Paul Seixas"
            maxLength={60}
            className="w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-[15px] font-semibold text-black placeholder:font-normal placeholder:text-black/35 shadow-sm transition focus:border-sps-violet600 focus:outline-none focus:ring-4 focus:ring-sps-violet600/15 dark:border-white/15 dark:bg-[#120B1A] dark:text-white dark:placeholder:text-white/35 dark:focus:border-sps-violet400"
          />
        </div>

        {/* Choix du groupe */}
        <div>
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-black/70 dark:text-white/70">
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
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3 py-2.5 text-[13px] font-extrabold transition-all active:scale-[0.98] ${
                    selected
                      ? "shadow-sm scale-[1.01]"
                      : "border-black/10 bg-black/[0.02] text-black/60 opacity-75 hover:opacity-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60"
                  }`}
                  style={{
                    color: selected ? info.hex : undefined,
                    borderColor: selected ? info.hex : undefined,
                    background: selected ? `${info.hex}18` : undefined,
                  }}
                >
                  <span className="flex items-center gap-1 font-black">
                    {selected && <Icon name="check" size={13} />}
                    {info.label}
                  </span>
                  <span className={`text-[11.5px] font-semibold ${selected ? "opacity-100" : "opacity-70"}`}>
                    · {info.range}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {conflict && getMyParticipation(conflict.id) && (
          <button
            type="button"
            disabled={pending}
            onClick={handleTransfer}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/15 py-2.5 text-xs font-extrabold text-amber-600 transition hover:bg-amber-500/25 active:scale-98 disabled:opacity-50 dark:text-amber-400"
          >
            <Icon name="refresh" size={14} />
            {pending ? "Basculement en cours…" : "Basculer mon inscription sur cette sortie"}
          </button>
        )}

        {/* Bouton Je participe */}
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sps-violet600 via-sps-violet700 to-sps-violet800 py-3.5 text-center text-[15.5px] font-black tracking-wide text-white shadow-lg shadow-sps-violet600/30 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
        >
          <span>{pending ? "Inscription en cours…" : "Je participe"}</span>
          {!pending && <Icon name="chevR" size={16} />}
        </button>
      </div>
    </form>
  );
}
