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
      aria-label="Boîte à idées (Admin)"
      title={
        unhandledCount > 0
          ? `Boîte à idées — ${unhandledCount} nouvelle${unhandledCount > 1 ? "s" : ""} idée${unhandledCount > 1 ? "s" : ""} à voir`
          : "Boîte à idées — Test réservé aux administrateurs"
      }
      className={`relative z-10 flex h-9 w-9 cursor-pointer touch-manipulation select-none items-center justify-center rounded-xl border border-black/[0.08] bg-white text-amber-500 shadow-cardSm transition-all duration-200 hover:scale-105 hover:text-amber-600 active:scale-95 dark:border-white/10 dark:bg-[#1A1422] dark:text-amber-400 ${className}`}
    >
      <Icon name="lightbulb" size={19} />
      {unhandledCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sps-red px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-[#1A1422]">
          {unhandledCount > 9 ? "9+" : unhandledCount}
        </span>
      )}
    </Link>
  );
}
