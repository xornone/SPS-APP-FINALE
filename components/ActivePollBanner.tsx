"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { Poll } from "@/lib/pollsStorage";
import { getOrCreateVoterToken, getInitialVoterName } from "@/lib/pollClient";
import { useIsAdmin } from "@/lib/useIsAdmin";

export function ActivePollBanner() {
  const isAdmin = useIsAdmin();
  const [activeUnvotedPoll, setActiveUnvotedPoll] = useState<Poll | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function checkPolls() {
      try {
        const token = getOrCreateVoterToken();
        const voterName = getInitialVoterName();
        const params = new URLSearchParams();
        if (token) params.set("voter_token", token);
        if (voterName) params.set("voter_name", voterName);

        const res = await fetch(`/api/polls?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data.polls)) {
          // Trouver le premier sondage en cours auquel le membre n'a pas encore répondu
          const unvoted = data.polls.find(
            (p: Poll) => !p.is_closed && (!p.user_voted_options || p.user_voted_options.length === 0)
          );
          setActiveUnvotedPoll(unvoted || null);
        }
      } catch {
        // Silencieux
      }
    }

    checkPolls();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin || !activeUnvotedPoll) return null;

  return (
    <div className="px-5 mb-3">
      <Link
        href="/sondages"
        className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-sps-violet600/30 bg-gradient-to-r from-sps-violet600/10 via-[#AA26FF]/10 to-sps-violet600/10 p-3 shadow-cardSm transition-all duration-200 hover:border-sps-violet600/50 hover:bg-sps-violet600/15 active:scale-[0.99] dark:border-sps-violet500/30 dark:from-sps-violet600/20 dark:via-[#AA26FF]/15 dark:to-sps-violet600/20"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-sps-violet600 text-white shadow-sm shadow-violet-600/30">
            <Icon name="poll" size={16} />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sps-violet600 dark:text-sps-violet400">
              <span className="h-1.5 w-1.5 rounded-full bg-sps-violet600 animate-pulse" />
              Sondage en cours
            </span>
            <p className="truncate text-xs font-bold text-neutral-900 dark:text-white">
              {activeUnvotedPoll.question}
            </p>
          </div>
        </div>

        <span className="flex h-7 items-center gap-1 rounded-xl bg-white/80 px-2.5 text-[11px] font-bold text-sps-violet700 shadow-xs group-hover:bg-white transition flex-shrink-0 dark:bg-white/10 dark:text-white">
          <span>Voter</span>
          <Icon name="chevR" size={12} />
        </span>
      </Link>
    </div>
  );
}
