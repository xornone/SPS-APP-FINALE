"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { Poll } from "@/lib/pollsStorage";
import { getOrCreateVoterToken, getInitialVoterName, isPollVotedLocally } from "@/lib/pollClient";
import { useIsAdmin } from "@/lib/useIsAdmin";

interface ActivePollBannerProps {
  initialPoll?: Poll | null;
  initialIsAdmin?: boolean;
}

export function ActivePollBanner({ initialPoll = null, initialIsAdmin = false }: ActivePollBannerProps) {
  const clientIsAdmin = useIsAdmin();
  const isAdmin = initialIsAdmin || clientIsAdmin;
  const isPollsLive = process.env.NEXT_PUBLIC_POLLS_LIVE === "true";
  const isVisible = isPollsLive || isAdmin;

  const [activePoll, setActivePoll] = useState<Poll | null>(initialPoll);
  const [hasVotedLocally, setHasVotedLocally] = useState<boolean>(() => {
    return initialPoll ? isPollVotedLocally(initialPoll.id) : false;
  });

  useEffect(() => {
    if (activePoll) {
      setHasVotedLocally(isPollVotedLocally(activePoll.id));
    }
  }, [activePoll]);

  useEffect(() => {
    if (!isVisible) return;
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
          // 1. Chercher en priorité un sondage en cours auquel le membre n'a pas encore voté
          const unvoted = data.polls.find(
            (p: Poll) => !p.is_closed && (!p.user_voted_options || p.user_voted_options.length === 0)
          );
          // 2. Sinon, afficher le premier sondage en cours (même si déjà voté)
          const anyActive = data.polls.find((p: Poll) => !p.is_closed);
          const found = unvoted || anyActive || null;
          setActivePoll(found);
          if (found) {
            setHasVotedLocally(
              isPollVotedLocally(found.id) ||
                Boolean(found.user_voted_options && found.user_voted_options.length > 0)
            );
          }
        }
      } catch {
        // Silencieux
      }
    }

    checkPolls();
    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  if (!isVisible || !activePoll) return null;

  const hasVoted = Boolean(
    (activePoll.user_voted_options && activePoll.user_voted_options.length > 0) || hasVotedLocally
  );

  return (
    <div className="px-5 mb-3">
      <Link
        href="/sondages"
        className={`group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border p-3 shadow-cardSm transition-all duration-200 active:scale-[0.99] ${
          hasVoted
            ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:from-emerald-500/15 dark:via-emerald-400/10 dark:to-emerald-500/15"
            : "border-sps-violet600/30 bg-gradient-to-r from-sps-violet600/10 via-[#AA26FF]/10 to-sps-violet600/10 hover:border-sps-violet600/50 hover:bg-sps-violet600/15 dark:border-sps-violet500/30 dark:from-sps-violet600/20 dark:via-[#AA26FF]/15 dark:to-sps-violet600/20"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
              hasVoted
                ? "bg-emerald-600 shadow-emerald-600/30"
                : "bg-sps-violet600 shadow-violet-600/30"
            }`}
          >
            <Icon name={hasVoted ? "check" : "poll"} size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                  hasVoted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-sps-violet600 dark:text-sps-violet400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasVoted ? "bg-emerald-500" : "bg-sps-violet600 animate-pulse"
                  }`}
                />
                {hasVoted ? "Sondage en cours • A voté" : "Sondage en cours"}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-white/40">
                ({activePoll.total_voters} votant{activePoll.total_voters > 1 ? "s" : ""})
              </span>
            </div>
            <p className="truncate text-xs font-bold text-neutral-900 dark:text-white">
              {activePoll.question}
            </p>
          </div>
        </div>

        <span
          className={`flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold shadow-xs transition flex-shrink-0 ${
            hasVoted
              ? "bg-white/80 text-emerald-700 group-hover:bg-white dark:bg-white/10 dark:text-emerald-300"
              : "bg-white/80 text-sps-violet700 group-hover:bg-white dark:bg-white/10 dark:text-white"
          }`}
        >
          <span>{hasVoted ? "Résultats" : "Voter"}</span>
          <Icon name="chevR" size={12} />
        </span>
      </Link>
    </div>
  );
}
