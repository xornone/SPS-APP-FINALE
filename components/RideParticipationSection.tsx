"use client";

import { useState } from "react";
import { JoinPanel } from "./JoinPanel";
import { ParticipantsList } from "./ParticipantsList";
import { AdminOnly } from "./AdminOnly";
import { WhatsAppShareButton } from "./WhatsAppShareButton";
import { Icon } from "./Icons";
import type { GroupLevel, Participation } from "@/lib/types";

/**
 * Regroupe JoinPanel et ParticipantsList sous un seul state partage : une
 * inscription, un retrait ou un changement de groupe apparait donc
 * immediatement dans "Participants", sans attendre router.refresh() (qui
 * peut renvoyer une page mise en cache quelques secondes, voir
 * export const revalidate sur la fiche sortie). Les boutons GPX/Strava et
 * "Publier sur WhatsApp" vivent ici aussi simplement parce qu'ils se
 * trouvent entre les deux dans la mise en page.
 */
export function RideParticipationSection({
  rideId,
  availableGroups,
  isPast,
  initialParticipants,
  gpxUrl,
  stravaUrl,
  shareMessage,
}: {
  rideId: string;
  availableGroups: GroupLevel[];
  isPast: boolean;
  initialParticipants: Participation[];
  gpxUrl: string | null;
  stravaUrl: string | null;
  shareMessage: string;
}) {
  const [participants, setParticipants] = useState(initialParticipants);

  return (
    <>
      <div className="px-5 pb-2">
        <JoinPanel
          rideId={rideId}
          availableGroups={availableGroups}
          isPast={isPast}
          participants={participants}
          onJoin={(p) => setParticipants((prev) => [...prev, p])}
          onLeave={(id) => setParticipants((prev) => prev.filter((p) => p.id !== id))}
          onChangeGroup={(id, group) =>
            setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, group_level: group } : p)))
          }
        />
      </div>

      <div className="flex gap-2.5 px-5 pb-2 pt-3">
        {gpxUrl && (
          <a
            href={gpxUrl}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
          >
            <Icon name="download" size={15} /> Télécharger GPX
          </a>
        )}
        {stravaUrl && (
          <a
            href={stravaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
          >
            <Icon name="external" size={15} /> Ouvrir sur Strava
          </a>
        )}
      </div>

      <AdminOnly>
        <div className="px-5 pb-2">
          <WhatsAppShareButton text={shareMessage} />
        </div>
      </AdminOnly>

      <div className="flex items-center justify-between px-5 pb-2.5 pt-5">
        <h2 className="font-display text-xl tracking-wide">Participants — {participants.length}</h2>
      </div>
      <ParticipantsList
        rideId={rideId}
        participants={participants}
        onRemoved={(ids) => setParticipants((prev) => prev.filter((p) => !ids.has(p.id)))}
      />
    </>
  );
}
