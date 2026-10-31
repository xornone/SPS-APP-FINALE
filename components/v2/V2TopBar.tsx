"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SuggestionButton } from "@/components/SuggestionButton";

export function V2TopBar({ title = "Peloton SPS", subtitle = "Club Cycliste" }: { title?: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.06] bg-white/80 px-5 py-3.5 backdrop-blur-xl transition-colors dark:border-white/[0.06] dark:bg-[#08050D]/80">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sps-violet600 via-[#8B5CF6] to-[#AA26FF] text-white font-black tracking-tighter text-xs shadow-lg shadow-violet-600/35 ring-1 ring-white/30">
          SPS
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#08050D] shadow-[0_0_8px_#34D399]" />
        </div>
        <div>
          <span className="block text-[9.5px] font-black uppercase tracking-widest text-[#8B5CF6] dark:text-[#AA26FF]">
            {subtitle}
          </span>
          <h1 className="font-display text-[22px] font-black leading-tight tracking-wide text-neutral-900 dark:text-white">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SuggestionButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
