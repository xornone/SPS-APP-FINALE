"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";

export function SuggestionButton({ className = "" }: { className?: string }) {
  const isAdmin = useIsAdmin();
  const [unhandledCount, setUnhandledCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function checkUnhandled() {
      try {
        const res = await fetch("/api/admin/suggestions");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const count = Array.isArray(data.suggestions)
          ? data.suggestions.filter((s: { status: string }) => s.status === "new").length
          : 0;
        setUnhandledCount(count);
      } catch {
        // Silencieux
      }
    }

    checkUnhandled();

    const interval = setInterval(checkUnhandled, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdmin]);

  // Avant-première : visible uniquement pour les administrateurs connectés
  if (!isAdmin) return null;

  return (
    <Link
      href="/boite-a-idees"
      prefetch={true}
      aria-label="Boîte à idées : Une idée >"
      title={
        unhandledCount > 0
          ? `Boîte à idées — ${unhandledCount} nouvelle${unhandledCount > 1 ? "s" : ""} idée${unhandledCount > 1 ? "s" : ""} à voir`
          : "Boîte à idées — Proposer une idée au club"
      }
      className={`group relative z-10 flex h-9 cursor-pointer touch-manipulation select-none items-center gap-1.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-amber-500/10 px-2.5 sm:px-3 text-amber-950 shadow-cardSm transition-all duration-200 hover:scale-[1.02] hover:border-amber-500/50 hover:bg-amber-500/20 hover:shadow active:scale-95 dark:border-amber-400/30 dark:from-amber-400/15 dark:via-amber-300/10 dark:to-amber-400/15 dark:text-amber-100 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/25 ${className}`}
    >
      <Icon
        name="lightbulb"
        size={16}
        className="flex-shrink-0 text-amber-500 transition-transform duration-200 group-hover:scale-110 dark:text-amber-400"
      />
      <span className="whitespace-nowrap text-[12px] font-bold tracking-tight sm:text-[12.5px]">
        Une idée
      </span>
      <Icon
        name="chevR"
        size={12}
        className="flex-shrink-0 text-amber-600/70 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-amber-300/80"
      />
      {unhandledCount > 0 && (
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sps-red px-1 text-[9px] font-black text-white shadow-sm ring-1 ring-white dark:ring-[#1A1422]">
          {unhandledCount > 9 ? "9+" : unhandledCount}
        </span>
      )}
    </Link>
  );
}
