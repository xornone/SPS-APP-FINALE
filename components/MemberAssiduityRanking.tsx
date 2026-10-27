"use client";

import { useMemo, useState } from "react";
import { AdminOnly } from "./AdminOnly";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import type { AssiduityEntry } from "@/lib/assiduity";
import { stripEmojiAndDiacritics } from "@/lib/members";

const INITIAL_PAGE_SIZE = 10;

/**
 * Classement nominatif des membres les plus assidus (nombre de sorties passées).
 * Basé sur la liste intégrale des membres actifs du club.
 * Réservé aux admins via AdminOnly (vérification côté client).
 */
export function MemberAssiduityRanking({ ranking }: { ranking: AssiduityEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const activeMembersCount = useMemo(
    () => ranking.filter((m) => m.count > 0).length,
    [ranking]
  );

  const cleanSearch = useMemo(
    () => stripEmojiAndDiacritics(search).toLowerCase().trim(),
    [search]
  );

  const filtered = useMemo(() => {
    if (!cleanSearch) return ranking;
    return ranking.filter((m) =>
      stripEmojiAndDiacritics(m.display).toLowerCase().includes(cleanSearch)
    );
  }, [ranking, cleanSearch]);

  if (ranking.length === 0) return null;

  const isSearching = cleanSearch.length > 0;
  const visible = isSearching
    ? filtered
    : showAll
    ? ranking
    : ranking.slice(0, INITIAL_PAGE_SIZE);

  return (
    <AdminOnly>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center gap-1.5">
          <Icon name="trophy" size={16} className="text-sps-violet600 dark:text-sps-violet400" />
          <h2 className="font-display text-xl tracking-wide">Membres les plus assidus</h2>
          <span className="rounded-full bg-sps-violet600/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-sps-violet600 dark:text-sps-violet400">
            Admin
          </span>
        </div>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">
          Visible par les admins uniquement · {ranking.length} membres ({activeMembersCount} avec sorties, {ranking.length - activeMembersCount} sans sortie).
        </p>

        {/* Barre de recherche rapide de membre */}
        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35">
            <Icon name="search" size={15} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full rounded-xl border border-black/[0.08] bg-white py-2 pl-9 pr-8 text-[13px] text-black outline-none transition placeholder:text-black/35 focus:border-sps-violet500 dark:border-white/10 dark:bg-[#1A1422] dark:text-white dark:placeholder:text-white/35"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-black/35 hover:text-black dark:text-white/35 dark:hover:text-white"
              aria-label="Effacer la recherche"
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        {visible.length === 0 ? (
          <div className="py-8 text-center text-sm text-black/40 dark:text-white/40">
            Aucun membre trouvé pour « {search} »
          </div>
        ) : (
          visible.map((m) => {
            // Index global d'origine dans le classement
            const originalRank = ranking.findIndex((entry) => entry.display === m.display) + 1;
            const hasRides = m.count > 0;

            return (
              <div
                key={m.display}
                className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-2.5 last:border-0 dark:border-white/[0.06]"
              >
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                    hasRides
                      ? "bg-sps-violet600/10 text-sps-violet600 dark:text-sps-violet400"
                      : "bg-black/[0.04] text-black/30 dark:bg-white/[0.05] dark:text-white/30"
                  }`}
                >
                  {originalRank}
                </span>

                <Avatar name={m.display} seed={m.display} size="sm" />

                <span
                  className={`flex-1 truncate text-[13.5px] ${
                    hasRides ? "font-bold text-black dark:text-white" : "font-medium text-black/75 dark:text-white/75"
                  }`}
                >
                  {m.display}
                </span>

                <span
                  className={`flex-none text-[12.5px] font-bold ${
                    hasRides
                      ? "text-sps-violet600 dark:text-sps-violet400"
                      : "text-black/35 dark:text-white/35"
                  }`}
                >
                  {m.count} sortie{m.count > 1 ? "s" : ""}
                </span>
              </div>
            );
          })
        )}

        {!isSearching && ranking.length > INITIAL_PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-black/[0.06] py-3 text-[12.5px] font-bold text-sps-violet600 transition hover:bg-black/[0.02] dark:border-white/10 dark:text-sps-violet400 dark:hover:bg-white/[0.02]"
          >
            {showAll
              ? "Afficher moins (top 10)"
              : `Afficher tous les membres (${ranking.length})`}
            <Icon name="chevDown" size={14} className={showAll ? "rotate-180" : ""} />
          </button>
        )}
      </div>
    </AdminOnly>
  );
}
