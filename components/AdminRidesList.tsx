"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icons";
import { fmtDateShort, fmtTime, isPastDate } from "@/lib/format";
import type { Ride } from "@/lib/types";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function formatMonthYear(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function AdminRidesList({ rides, counts }: { rides: Ride[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentMonthKey = getCurrentMonthKey();

  // Le mois actuel est déjà ouvert par défaut, les mois passés sont fermés jusqu'au clic
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([currentMonthKey]));

  const toggleMonth = (key: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer définitivement « ${title} » ?`)) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/rides/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) router.refresh();
    else alert("Impossible de supprimer cette sortie.");
  }

  // Sorties à venir (du plus proche au plus lointain)
  const upcomingRides = rides
    .filter((r) => !isPastDate(r.ride_date))
    .sort((a, b) => (a.ride_date > b.ride_date ? 1 : -1));

  // Sorties passées (antéchronologique : plus récentes d'abord)
  const pastRides = rides
    .filter((r) => isPastDate(r.ride_date))
    .sort((a, b) => (a.ride_date < b.ride_date ? 1 : -1));

  // Regroupement des sorties passées par mois (clé: "AAAA-MM")
  const pastGroupsMap = new Map<string, Ride[]>();
  pastRides.forEach((r) => {
    const key = r.ride_date.slice(0, 7);
    const list = pastGroupsMap.get(key) || [];
    list.push(r);
    pastGroupsMap.set(key, list);
  });

  // Mois triés du plus récent au plus ancien
  const pastMonthKeys = Array.from(pastGroupsMap.keys()).sort((a, b) => (a < b ? 1 : -1));

  const renderRideCard = (r: Ride, isPast = false) => (
    <div
      key={r.id}
      className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-cardSm transition-colors dark:border-white/10 dark:bg-[#1A1422]"
    >
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-extrabold">
          {r.title}
        </b>
        <span className="text-[11.5px] text-black/45 dark:text-white/45">
          {fmtDateShort(r.ride_date)} · {fmtTime(r.ride_time)} · {counts[r.id] || 0} participants
        </span>
      </div>
      <div className="flex flex-none gap-1.5">
        <Link
          href={`/admin/rides/${r.id}/edit`}
          prefetch={true}
          aria-label={`Modifier ${r.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/[0.08] bg-black/[0.02] transition-colors hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <Icon name="pencil" size={15} />
        </Link>
        <button
          type="button"
          disabled={busyId === r.id}
          onClick={() => handleDelete(r.id, r.title)}
          aria-label={`Supprimer ${r.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/[0.08] bg-black/[0.02] text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-red-500/20"
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="pb-24">
      {/* 1. Sorties programmées (à venir) */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-5 pb-2">
          <h2 className="font-display text-lg tracking-wide">
            Sorties programmées
          </h2>
          <span className="rounded-full bg-sps-violet600/10 px-2.5 py-0.5 text-xs font-bold text-sps-violet600 dark:bg-sps-violet400/10 dark:text-sps-violet400">
            {upcomingRides.length} {upcomingRides.length > 1 ? "sorties" : "sortie"}
          </span>
        </div>

        {upcomingRides.length > 0 ? (
          <div className="flex flex-col gap-2.5 px-5">
            {upcomingRides.map((r) => renderRideCard(r, false))}
          </div>
        ) : (
          <div className="mx-5 rounded-2xl border border-black/[0.06] bg-white p-4 text-center text-xs text-black/40 dark:border-white/10 dark:bg-[#1A1422] dark:text-white/40">
            Aucune sortie programmée pour le moment.
          </div>
        )}
      </div>

      {/* 2. Sorties passées regroupées par mois/année (accordéon déroulant) */}
      {pastMonthKeys.length > 0 && (
        <div>
          <div className="px-5 pb-3">
            <h2 className="font-display text-lg tracking-wide">
              Sorties passées ({pastRides.length})
            </h2>
            <p className="text-[11.5px] text-black/40 dark:text-white/40">
              Classées par intercalaires mensuels. Clique pour afficher ou masquer.
            </p>
          </div>

          <div className="flex flex-col gap-3 px-5">
            {pastMonthKeys.map((key) => {
              const monthRides = pastGroupsMap.get(key) || [];
              const isOpen = openMonths.has(key);
              const label = formatMonthYear(key);
              const isCurrent = key === currentMonthKey;

              return (
                <div
                  key={key}
                  className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-cardSm transition-all dark:border-white/10 dark:bg-[#1A1422]"
                >
                  {/* Intercalaire déroulant */}
                  <button
                    type="button"
                    onClick={() => toggleMonth(key)}
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] tracking-wide text-black/90 dark:text-white/90">
                        {label}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Mois en cours
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[11px] font-bold text-black/50 dark:bg-white/[0.08] dark:text-white/50">
                        {monthRides.length} {monthRides.length > 1 ? "sorties" : "sortie"}
                      </span>
                      <Icon
                        name="chevDown"
                        size={16}
                        className={`text-black/40 transition-transform duration-200 dark:text-white/40 ${
                          isOpen ? "rotate-180 text-sps-violet600 dark:text-sps-violet400" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Liste déroulante des sorties du mois */}
                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-black/[0.06] bg-black/[0.02] p-2.5 dark:border-white/[0.06] dark:bg-black/25">
                      {monthRides.map((r) => renderRideCard(r, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
