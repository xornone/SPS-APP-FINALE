"use client";

import { useEffect, useState } from "react";
import { JoinPanel } from "./JoinPanel";
import { ParticipantsList } from "./ParticipantsList";
import { AdminOnly } from "./AdminOnly";
import { WhatsAppShareButton } from "./WhatsAppShareButton";
import { Icon } from "./Icons";
import { isAdminName } from "@/lib/admins";
import { hapticTap } from "@/lib/haptics";
import type { GroupLevel, Participation } from "@/lib/types";

/**
 * Regroupe JoinPanel et ParticipantsList sous un seul state partagé : une
 * inscription, un retrait ou un changement de groupe apparaît donc
 * immédiatement dans "Participants", sans attendre router.refresh().
 *
 * Gère également le capitaine de route en state local réactif.
 */
export function RideParticipationSection({
  rideId,
  availableGroups,
  isPast,
  initialParticipants,
  gpxUrl,
  stravaUrl,
  shareMessage,
  captainName,
}: {
  rideId: string;
  availableGroups: GroupLevel[];
  isPast: boolean;
  initialParticipants: Participation[];
  gpxUrl: string | null;
  stravaUrl: string | null;
  shareMessage: string;
  captainName?: string | null;
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [captain, setCaptain] = useState(captainName ?? null);

  useEffect(() => {
    setCaptain(captainName ?? null);
  }, [captainName]);

  return (
    <>
      <div className="px-5 pb-2">
        <JoinPanel
          rideId={rideId}
          availableGroups={availableGroups}
          isPast={isPast}
          participants={participants}
          onJoin={(p) => {
            setParticipants((prev) => [p, ...prev]);
            if (isAdminName(p.participant_name)) {
              setCaptain((prev) => (prev ? `${prev}, ${p.participant_name}` : p.participant_name));
            }
          }}
          onLeave={(id) => {
            const leaving = participants.find((p) => p.id === id);
            setParticipants((prev) => prev.filter((p) => p.id !== id));
            if (leaving && isAdminName(leaving.participant_name)) {
              const remaining = participants
                .filter((p) => p.id !== id && isAdminName(p.participant_name))
                .map((p) => p.participant_name);
              setCaptain(remaining.length > 0 ? remaining.join(", ") : null);
            }
          }}
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
            onClick={() => hapticTap(12)}
            className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-black/10 bg-white py-3 px-2 text-[12px] sm:text-[13px] font-bold transition-all duration-150 active:scale-[0.98] hover:border-sps-violet500/40 hover:bg-black/[0.02] dark:border-white/15 dark:bg-[#1A1422] dark:hover:bg-white/[0.03] whitespace-nowrap"
          >
            <Icon name="download" size={14} className="flex-shrink-0" />
            <span className="truncate sm:overflow-visible">Trace GPX</span>
          </a>
        )}
        {stravaUrl && (
          <a
            href={stravaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => hapticTap(10)}
            className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-black/10 bg-white py-3 px-2 text-[12px] sm:text-[13px] font-bold transition-all duration-150 active:scale-[0.98] hover:border-[#FC4C02]/40 hover:bg-[#FC4C02]/5 dark:border-white/15 dark:bg-[#1A1422] dark:hover:bg-[#FC4C02]/10 whitespace-nowrap"
          >
            <Icon name="external" size={14} className="flex-shrink-0" />
            <span className="truncate sm:overflow-visible">Lien Strava</span>
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
        captainName={captain}
        onCaptainChange={(newCap) => setCaptain(newCap)}
        onRemoved={(ids) => setParticipants((prev) => prev.filter((p) => !ids.has(p.id)))}
      />
    </>
  );
}
