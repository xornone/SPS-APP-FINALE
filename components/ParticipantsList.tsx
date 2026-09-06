"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { GroupBadge } from "./GroupBadge";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { Participation } from "@/lib/types";

/**
 * Liste des participants d'une sortie. Le tableau est controle par le
 * parent (voir RideParticipationSection) plutot que copie dans un state
 * local : ainsi une inscription/un retrait via JoinPanel se reflete ici
 * immediatement, sans attendre un rechargement serveur. Pour un admin
 * (verifie cote client, voir lib/useIsAdmin.ts), chaque ligne gagne une
 * case a cocher permettant de selectionner un ou plusieurs participants a
 * retirer ; une confirmation explicite (avec les noms concernes) est
 * demandee avant tout retrait, pour eviter une manipulation involontaire.
 */
export function ParticipantsList({
  rideId,
  participants,
  onRemoved,
}: {
  rideId: string;
  participants: Participation[];
  /** Met a jour la liste partagee du parent une fois le retrait confirme cote serveur. */
  onRemoved: (ids: Set<string>) => void;
}) {
  const isAdmin = useIsAdmin();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    onRemoved(removedIds);
    setSelected(new Set());
  }

  return (
    <div
      data-ride-id={rideId}
      className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]"
    >
      {participants.length === 0 ? (
        <p className="p-6 text-center text-sm text-black/40 dark:text-white/40">Personne n&apos;est encore inscrit.</p>
      ) : (
        participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
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
            <span className="flex-1 text-[13.5px] font-bold">{p.participant_name}</span>
            <GroupBadge group={p.group_level} withRange={false} />
          </div>
        ))
      )}

      {isAdmin && selected.size > 0 && (
        <div className="flex flex-col gap-2 border-t border-black/[0.06] p-3 dark:border-white/10">
          {error && <p className="text-xs text-red-500">{error}</p>}
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
