"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icons";
import type { Notification } from "@/lib/types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

const KIND_ICON: Record<Notification["kind"], "plus" | "route" | "members" | "x"> = {
  ride_created: "plus",
  ride_updated: "route",
  new_participant: "members",
  ride_cancelled: "x",
};

export function NotifBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setItems(data || []);
        setLoaded(true);
      });
  }, [open, loaded]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
      >
        <Icon name="bell" size={17} />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-black/[0.06] bg-white p-2 shadow-card dark:border-white/10 dark:bg-[#211930]">
            {items.length === 0 ? (
              <p className="p-3 text-center text-xs text-black/40 dark:text-white/40">
                {loaded ? "Aucune notification pour le moment." : "Chargement…"}
              </p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="flex gap-2.5 rounded-xl p-2 hover:bg-black/[0.03] dark:hover:bg-white/5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-violet-500/15 text-sps-violet600 dark:text-sps-violet400">
                    <Icon name={KIND_ICON[n.kind]} size={14} />
                  </span>
                  <div>
                    <p className="text-xs leading-snug">{n.message}</p>
                    <time className="text-[10.5px] text-black/35 dark:text-white/35">{timeAgo(n.created_at)}</time>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
