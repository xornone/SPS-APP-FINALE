"use client";

import { useState } from "react";
import { AdminOnly } from "./AdminOnly";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import type { AssiduityEntry } from "@/lib/assiduity";

/**
 * Classement nominatif des membres les plus assidus (nombre de sorties
 * passees) — volontairement absent de la page Statistique SPS publique
 * (voir le commentaire en tete de app/(shell)/classement/page.tsx) pour ne
 * pas mettre les membres en competition les uns contre les autres. Reserve
 * aux admins via AdminOnly (verification cote client, meme modele que le
 * bouton "Publier sur WhatsApp" — voir lib/useIsAdmin.ts) et replie par
 * defaut derriere un bouton "Voir le classement".
 */
export function MemberAssiduityRanking({ ranking }: { ranking: AssiduityEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  if (ranking.length === 0) return null;

  return (
    <AdminOnly>
      <div className="px-5 pb-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-xl tracking-wide">Membres les plus assidus</h2>
          <span className="rounded-full bg-sps-violet600/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-sps-violet600 dark:text-sps-violet400">
            Admin
          </span>
        </div>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">
          Visible par les admins uniquement · top {ranking.length}.
        </p>
      </div>
      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-[13px] font-bold"
        >
          <span className="flex items-center gap-2">
            <Icon name="trophy" size={16} className="text-sps-violet600 dark:text-sps-violet400" />
            {expanded ? "Réduire le classement" : "Voir le classement"}
          </span>
          <Icon name="chevDown" size={15} className={expanded ? "rotate-180" : ""} />
        </button>
        {expanded && (
          <div className="border-t border-black/[0.06] dark:border-white/10">
            {ranking.map((m, i) => (
              <div
                key={m.display}
                className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-2.5 last:border-0 dark:border-white/[0.06]"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sps-violet600/10 text-[11px] font-bold text-sps-violet600 dark:text-sps-violet400">
                  {i + 1}
                </span>
                <Avatar name={m.display} seed={m.display} size="sm" />
                <span className="flex-1 truncate text-[13.5px] font-bold">{m.display}</span>
                <span className="flex-none text-[12.5px] font-bold text-black/45 dark:text-white/45">
                  {m.count} sortie{m.count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
