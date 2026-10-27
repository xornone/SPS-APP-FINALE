"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { GROUP_INFO, type GroupLevel, type Participation, type Ride } from "@/lib/types";
import {
  clearMyParticipation,
  getLastUsedName,
  getMyParticipation,
  setMyParticipation,
  type MyParticipation,
} from "@/lib/myParticipations";
import { fmtDateLong, fmtKm, fmtM, fmtTime } from "@/lib/format";

interface QuickJoinModalProps {
  ride: Ride | null;
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (participation: Participation) => void;
  onLeaveSuccess: (participationId: string, rideId: string) => void;
  onChangeGroupSuccess: (participationId: string, newGroup: GroupLevel) => void;
}

export function QuickJoinModal({
  ride,
  isOpen,
  onClose,
  onJoinSuccess,
  onLeaveSuccess,
  onChangeGroupSuccess,
}: QuickJoinModalProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ id: string; title: string } | null>(null);
  const [mine, setMine] = useState<MyParticipation | null>(null);
  const [name, setName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<GroupLevel>("vert");

  const availableGroups = (ride?.ride_groups || []).map((g) => g.group_level as GroupLevel);

  useEffect(() => {
    if (!ride || !isOpen) return;

    setError("");
    setConflict(null);
    setPending(false);

    const stored = getMyParticipation(ride.id);
    setMine(stored);

    const lastName = getLastUsedName();
    setName(lastName);

    if (availableGroups.length > 0) {
      if (stored && availableGroups.includes(stored.group_level as GroupLevel)) {
        setSelectedGroup(stored.group_level as GroupLevel);
      } else {
        setSelectedGroup(availableGroups[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, isOpen]);

  // Bloquer le defilement de l'arriere-plan quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fermer sur appui de la touche Echap
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ride) return null;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!ride) return;

    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setError("Indique ton prénom et ton nom pour t'inscrire.");
      return;
    }
    if (trimmed.split(" ").length < 2) {
      setError("Indique ton prénom ET ton nom (ex. « Julie Martin »).");
      return;
    }

    setError("");
    setConflict(null);
    setPending(true);

    try {
      const res = await fetch("/api/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: ride.id,
          participant_name: trimmed,
          group_level: selectedGroup,
        }),
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

      const record: MyParticipation = {
        id: data.id,
        client_token: data.client_token,
        participant_name: trimmed,
        group_level: selectedGroup,
      };
      setMyParticipation(ride.id, record);
      setMine(record);

      onJoinSuccess({
        id: data.id,
        ride_id: ride.id,
        participant_name: trimmed,
        group_level: selectedGroup,
        created_at: new Date().toISOString(),
      });

      router.refresh();
      onClose();
    } catch {
      setPending(false);
      setError("Erreur de connexion. Réessaie dans un instant.");
    }
  }

  async function handleTransfer() {
    if (!ride || !conflict) return;
    const storedConflict = getMyParticipation(conflict.id);
    if (!storedConflict) return;

    const trimmed = name.trim().replace(/\s+/g, " ");
    setError("");
    setPending(true);

    try {
      const res = await fetch("/api/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: ride.id,
          participant_name: trimmed,
          group_level: selectedGroup,
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
      onLeaveSuccess(storedConflict.id, conflict.id);

      const record: MyParticipation = {
        id: data.id,
        client_token: data.client_token,
        participant_name: trimmed,
        group_level: selectedGroup,
      };
      setMyParticipation(ride.id, record);
      setMine(record);

      onJoinSuccess({
        id: data.id,
        ride_id: ride.id,
        participant_name: trimmed,
        group_level: selectedGroup,
        created_at: new Date().toISOString(),
      });

      router.refresh();
      onClose();
    } catch {
      setPending(false);
      setError("Erreur réseau lors du basculement d'inscription.");
    }
  }

  async function handleLeave() {
    if (!mine || !ride) return;
    setPending(true);
    setError("");

    try {
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

      const removedId = mine.id;
      clearMyParticipation(ride.id);
      setMine(null);

      onLeaveSuccess(removedId, ride.id);
      router.refresh();
      onClose();
    } catch {
      setPending(false);
      setError("Erreur de connexion lors de la désinscription.");
    }
  }

  async function handleChangeGroup(g: GroupLevel) {
    if (!mine || !ride || g === mine.group_level) return;
    setPending(true);
    setError("");

    try {
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

      const updated: MyParticipation = { ...mine, group_level: g };
      setMyParticipation(ride.id, updated);
      setMine(updated);
      setSelectedGroup(g);

      onChangeGroupSuccess(mine.id, g);
      router.refresh();
    } catch {
      setPending(false);
      setError("Erreur de connexion lors du changement de groupe.");
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[28px] border border-black/[0.08] bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1A1422] sm:rounded-[28px]"
      >
        {/* Poignee tactile sur mobile */}
        <div className="mx-auto -mt-1 mb-3.5 h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/15 sm:hidden" />

        {/* En-tete */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-sps-violet600 dark:text-sps-violet400">
              <Icon name="bike" size={14} />
              <span>{fmtDateLong(ride.ride_date)} · {fmtTime(ride.ride_time)}</span>
            </div>
            <h3 className="mt-0.5 font-display text-[21px] font-bold leading-snug tracking-wide">
              {ride.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-black/50 dark:text-white/50">
              {fmtKm(ride.distance_km)} · {fmtM(ride.elevation_gain_m)} D+ · {ride.place}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-black/5 text-black/60 transition hover:bg-black/10 active:scale-95 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Cas 1 : L'utilisateur est deja inscrit */}
        {mine ? (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-emerald-800 dark:text-emerald-300">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                <Icon name="check" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold">Tu es inscrit(e) à cette sortie !</p>
                <p className="text-[11.5px] opacity-85">
                  Nom : <b>{mine.participant_name}</b> · Groupe{" "}
                  <b className="capitalize">{mine.group_level}</b>
                </p>
              </div>
            </div>

            {availableGroups.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-black/40 dark:text-white/40">
                  Changer de groupe :
                </p>
                <div className="flex gap-2">
                  {availableGroups.map((g) => {
                    const info = GROUP_INFO[g];
                    const selected = mine.group_level === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        disabled={pending}
                        onClick={() => handleChangeGroup(g)}
                        className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2 text-[11px] font-extrabold transition active:scale-95 disabled:opacity-50"
                        style={{
                          color: info.hex,
                          borderColor: selected ? info.hex : "rgba(0,0,0,.08)",
                          background: selected ? `${info.hex}1A` : "transparent",
                        }}
                      >
                        <b className="text-[12px]">{info.label}</b>
                        <span className="text-[10px] opacity-85">{info.range}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-xs font-bold text-red-500">{error}</p>}

            {/* Bouton de desinscription */}
            <button
              type="button"
              disabled={pending}
              onClick={handleLeave}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-3.5 text-sm font-extrabold text-red-600 transition hover:bg-red-500/15 active:scale-98 disabled:opacity-50 dark:text-red-400"
            >
              <Icon name="x" size={16} />
              {pending ? "Désinscription en cours…" : "Me désinscrire de la sortie"}
            </button>

            {/* Lien rapide vers la fiche complete */}
            <Link
              href={`/rides/${ride.id}`}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-black/[0.04] py-2.5 text-center text-xs font-bold text-black/60 transition hover:bg-black/[0.08] hover:text-black dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Voir la fiche complète de la sortie <Icon name="chevR" size={13} />
            </Link>
          </div>
        ) : (
          /* Cas 2 : L'utilisateur n'est pas encore inscrit */
          <form onSubmit={handleJoin} className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-black/40 dark:text-white/40">
                Ton prénom et ton nom
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Lucas Martin"
                maxLength={60}
                autoFocus
                className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-3 text-sm font-medium transition focus:border-sps-violet600 focus:bg-white focus:outline-none dark:border-white/15 dark:bg-white/5 dark:focus:border-sps-violet400 dark:focus:bg-[#1A1422]"
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-black/40 dark:text-white/40">
                Je roulerai avec :
              </p>
              <div className="flex gap-2">
                {availableGroups.map((g) => {
                  const info = GROUP_INFO[g];
                  const selected = selectedGroup === g;
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2 text-[11px] font-extrabold transition active:scale-95"
                      style={{
                        color: info.hex,
                        borderColor: selected ? info.hex : "rgba(0,0,0,.08)",
                        background: selected ? `${info.hex}1A` : "transparent",
                      }}
                    >
                      <b className="text-[12px]">{info.label}</b>
                      <span className="text-[10px] opacity-85">{info.range}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-xs font-bold text-red-500">{error}</p>}

            {conflict && getMyParticipation(conflict.id) && (
              <button
                type="button"
                disabled={pending}
                onClick={handleTransfer}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/15 py-3 text-xs font-extrabold text-amber-600 transition hover:bg-amber-500/25 active:scale-98 disabled:opacity-50 dark:text-amber-400"
              >
                <Icon name="refresh" size={14} />
                {pending ? "Basculement en cours…" : "Basculer mon inscription sur cette sortie"}
              </button>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 py-3.5 text-sm font-extrabold text-white shadow-lg transition active:scale-98 disabled:opacity-50"
            >
              <Icon name="check" size={16} />
              {pending ? "Inscription en cours…" : "Confirmer mon inscription 🚀"}
            </button>

            <Link
              href={`/rides/${ride.id}`}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-black/[0.04] py-2.5 text-center text-xs font-bold text-black/60 transition hover:bg-black/[0.08] hover:text-black dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Voir la fiche complète de la sortie <Icon name="chevR" size={13} />
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
