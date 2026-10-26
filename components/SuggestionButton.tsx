"use client";

import Link from "next/link";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";

export function SuggestionButton({ className = "" }: { className?: string }) {
  const isAdmin = useIsAdmin();

  // Avant-première : visible uniquement pour les administrateurs connectés
  if (!isAdmin) return null;

  return (
    <Link
      href="/boite-a-idees"
      prefetch={true}
      aria-label="Boîte à idées (Admin)"
      title="Boîte à idées — Test réservé aux administrateurs"
      className={`relative z-10 flex h-9 w-9 cursor-pointer touch-manipulation select-none items-center justify-center rounded-xl border border-black/[0.08] bg-white text-amber-500 shadow-cardSm transition-all duration-200 hover:scale-105 hover:text-amber-600 active:scale-95 dark:border-white/10 dark:bg-[#1A1422] dark:text-amber-400 ${className}`}
    >
      <Icon name="lightbulb" size={19} />
    </Link>
  );
}
