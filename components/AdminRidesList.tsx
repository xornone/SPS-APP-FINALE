"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icons";
import { fmtDateShort, fmtTime, isPastDate } from "@/lib/format";
import type { Ride } from "@/lib/types";

export function AdminRidesList({ rides, counts }: { rides: Ride[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer définitivement « ${title} » ?`)) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/rides/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) router.refresh();
    else alert("Impossible de supprimer cette sortie.");
  }

  return (
    <div className="flex flex-col gap-2.5 px-5 pb-24">
      {rides.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1A1422]"
        >
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[13.5px] font-extrabold">
              {r.title} {isPastDate(r.ride_date) && <span className="font-semibold text-black/35 dark:text-white/35">· passée</span>}
            </b>
            <span className="text-[11.5px] text-black/45 dark:text-white/45">
              {fmtDateShort(r.ride_date)} · {fmtTime(r.ride_time)} · {counts[r.id] || 0} participants
            </span>
          </div>
          <div className="flex flex-none gap-1.5">
            <Link
              href={`/admin/rides/${r.id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/[0.08] bg-black/[0.02] dark:border-white/10 dark:bg-white/5"
            >
              <Icon name="pencil" size={15} />
            </Link>
            <button
              disabled={busyId === r.id}
              onClick={() => handleDelete(r.id, r.title)}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/[0.08] bg-black/[0.02] text-red-500 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
