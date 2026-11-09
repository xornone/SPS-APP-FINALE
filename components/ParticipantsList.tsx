"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { GroupBadge } from "./GroupBadge";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { isAdminName } from "@/lib/admins";
import { stripEmojiAndDiacritics } from "@/lib/members";
import type { Participation } from "@/lib/types";

/**
 * Liste des participants d'une sortie. Le tableau est contrôlé par le
 * parent (voir RideParticipationSection) plutôt que copié dans un state
 * local : ainsi une inscription/un retrait via JoinPanel se reflète ici
 * immédiatement, sans attendre un rechargement serveur.
 *
 * Les participants sont ordonnés par ordre d'inscription : le premier inscrit
 * se trouve en bas de liste, le plus récemment inscrit en haut.
 *
 * Pour un admin :
 * - Case à cocher pour sélectionner un ou plusieurs participants à retirer.
 * - Bouton 🧭 sur chaque participant pour le désigner comme capitaine de route
 *   en 1 clic (ou lui retirer le rôle s'il est déjà capitaine).
 */
const COLLAPSE_THRESHOLD = 8;

export function ParticipantsList({
  rideId,
  participants,
  captainName,
  onRemoved,
  onCaptainChange,
}: {
  rideId: string;
  participants: Participation[];
  captainName?: string | null;
  /** Met à jour la liste partagée du parent une fois le retrait confirmé côté serveur. */
  onRemoved: (ids: Set<string>) => void;
  /** Notifie le parent d'un changement de capitaine pour mise à jour instantanée. */
  onCaptainChange?: (newCaptain: string | null) => void;
}) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [captainPending, setCaptainPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Ordonné par date d'inscription : plus récent en haut, premier inscrit en bas
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return 0;
    });
  }, [participants]);

  const isCollapsible = sortedParticipants.length > COLLAPSE_THRESHOLD;
  const visibleParticipants = isCollapsible && !expanded ? sortedParticipants.slice(0, COLLAPSE_THRESHOLD) : sortedParticipants;

  function isCaptain(name: string) {
    if (isAdminName(name)) return true;
    if (!captainName) return false;
    const norm = stripEmojiAndDiacritics(name).toLowerCase().trim();
    const parts = captainName.split(/[,;\/]+/).map((s) => stripEmojiAndDiacritics(s).toLowerCase().trim());
    return parts.includes(norm);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleToggleCaptain(name: string) {
    const isCurrent = isCaptain(name);
    const targetName = isCurrent ? "" : name;
    setCaptainPending(name);
    setError("");

    try {
      const res = await fetch(`/api/admin/rides/${rideId}/captain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captainName: targetName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Impossible de désigner le leader.");
      } else {
        onCaptainChange?.(data.captain || null);
        router.refresh();
      }
    } catch {
      setError("Erreur de connexion lors de la désignation du leader.");
    } finally {
      setCaptainPending(null);
    }
  }

  async function handleRemove() {
    if (selected.size === 0) return;
    const toRemove = participants.filter((p) => selected.has(p.id));
    const confirmed = window.confirm(
      `Retirer ${toRemove.length > 1 ? "ces participants" : "ce participant"} de la sortie ?\n\n` +
        toRemove.map((p) => `• ${p.participant_name}`).join("\n")
    );
    if (!confirmed) return;

    setError("");
    setPending(true);
    const results = await Promise.all(
      toRemove.map((p) =>
        fetch(`/api/participations/${p.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then((res) => ({ id: p.id, ok: res.ok }))
      )
    );
    setPending(false);
    const removedIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    if (removedIds.size < toRemove.length) {
      setError("Certains participants n'ont pas pu être retirés.");
    }

    // Si le capitaine retiré faisait partie des sélectionnés, réinitialiser le capitaine
    if (toRemove.some((p) => isCaptain(p.participant_name))) {
      fetch(`/api/admin/rides/${rideId}/captain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captainName: "" }),
      }).catch(() => {});
      onCaptainChange?.(null);
    }

    onRemoved(removedIds);
    setSelected(new Set());
  }

  return (
    <div
      data-ride-id={rideId}
      className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]"
    >
      {/* Bandeau d'aide discret pour les admins */}
      {isAdmin && participants.length > 0 && (
        <div className="flex items-center justify-between border-b border-black/[0.05] bg-black/[0.02] px-4 py-1.5 text-[11px] font-medium text-black/50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/50">
          <span>💡 Cliquez sur 🧭 pour désigner le Groupe Leader</span>
          {captainName && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              Actuel : {captainName}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {participants.length === 0 ? (
        <p className="p-6 text-center text-sm text-black/40 dark:text-white/40">Personne n&apos;est encore inscrit.</p>
      ) : (
        visibleParticipants.map((p) => (
          <div key={p.id} className="flex items-center gap-2.5 px-4 py-2.5">
            {isAdmin && (
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 flex-none accent-sps-violet600"
                aria-label={`Sélectionner ${p.participant_name} pour retrait`}
              />
            )}
            <Avatar name={p.participant_name} seed={p.participant_name} />
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <span className="text-[13.5px] font-bold truncate">{p.participant_name}</span>
              {isCaptain(p.participant_name) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-300 flex-shrink-0 whitespace-nowrap">
                  🧭 Leader
                  {isAdmin && !isAdminName(p.participant_name) && (
                    <button
                      type="button"
                      disabled={captainPending !== null}
                      onClick={() => handleToggleCaptain(p.participant_name)}
                      className="ml-1 text-amber-800/80 hover:text-red-600 dark:text-amber-200/80 dark:hover:text-red-400 font-black text-xs leading-none"
                      title="Retirer le rôle de leader"
                      aria-label="Retirer le rôle de leader"
                    >
                      ✕
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Action admin : désigner Groupe Leader */}
            {isAdmin && !isCaptain(p.participant_name) && (
              <button
                type="button"
                disabled={captainPending !== null}
                onClick={() => handleToggleCaptain(p.participant_name)}
                className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1 text-[11px] font-bold text-black/65 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-800 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-300 transition-colors flex-shrink-0"
                title={`Désigner ${p.participant_name} comme Groupe Leader`}
              >
                <span>🧭</span>
                <span className="hidden sm:inline">
                  {captainPending === p.participant_name ? "En cours…" : "Leader"}
                </span>
              </button>
            )}

            <GroupBadge group={p.group_level} withRange={false} />
          </div>
        ))
      )}

      {isCollapsible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-black/[0.06] py-3 text-[12.5px] font-bold text-sps-violet600 dark:border-white/10 dark:text-sps-violet400"
        >
          {expanded ? "Réduire la liste" : `Voir les ${participants.length} participants`}
          <Icon name="chevDown" size={14} className={expanded ? "rotate-180" : ""} />
        </button>
      )}

      {isAdmin && selected.size > 0 && (
        <div className="flex flex-col gap-2 border-t border-black/[0.06] p-3 dark:border-white/10">
          <button
            type="button"
            disabled={pending}
            onClick={handleRemove}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-[13px] font-bold text-red-600 disabled:opacity-60 dark:text-red-400"
          >
            <Icon name="trash" size={14} />
            {pending ? "Retrait…" : `Retirer ${selected.size} participant${selected.size > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
