"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { Poll } from "@/lib/pollsStorage";
import { getOrCreateVoterToken, getInitialVoterName, isPollVotedLocally } from "@/lib/pollClient";

interface ActivePollBannerProps {
  initialPoll?: Poll | null;
  initialPolls?: Poll[];
  initialIsAdmin?: boolean;
}

export function ActivePollBanner({ initialPoll = null, initialPolls }: ActivePollBannerProps) {
  const [activePolls, setActivePolls] = useState<Poll[]>(() => {
    if (initialPolls) return initialPolls.filter((p) => !p.is_closed);
    if (initialPoll && !initialPoll.is_closed) return [initialPoll];
    return [];
  });

  useEffect(() => {
    if (initialPolls) {
      setActivePolls(initialPolls.filter((p) => !p.is_closed));
    } else if (initialPoll && !initialPoll.is_closed) {
      setActivePolls([initialPoll]);
    }
  }, [initialPolls, initialPoll]);

  useEffect(() => {
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
          const active = data.polls.filter((p: Poll) => !p.is_closed);
          setActivePolls(active);
        }
      } catch {
        // Silencieux
      }
    }

    checkPolls();
    return () => {
      cancelled = true;
    };
  }, []);

  if (activePolls.length === 0) return null;

  // Trier pour mettre les sondages non votés en premier
  const sortedPolls = [...activePolls].sort((a, b) => {
    const aVoted = Boolean(
      (a.user_voted_options && a.user_voted_options.length > 0) || isPollVotedLocally(a.id)
    );
    const bVoted = Boolean(
      (b.user_voted_options && b.user_voted_options.length > 0) || isPollVotedLocally(b.id)
    );
    if (aVoted === bVoted) return 0;
    return aVoted ? 1 : -1;
  });

  return (
    <div className="px-5 mb-4">
      {/* En-tête si plusieurs sondages en cours */}
      {sortedPolls.length > 1 && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-sps-violet600/10 text-sps-violet600 dark:bg-sps-violet600/20 dark:text-sps-violet400">
              <Icon name="poll" size={12} />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Sondages en cours ({sortedPolls.length})
            </span>
          </div>
          <Link
            href="/sondages"
            className="text-[11px] font-bold text-sps-violet600 hover:underline dark:text-sps-violet400"
          >
            Tout voir →
          </Link>
        </div>
      )}

      {/* Conteneur unifié des sondages : ensemble, pas scindé */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/70 shadow-cardSm divide-y divide-neutral-100 dark:border-white/10 dark:bg-[#1A1424]/80 dark:divide-white/5 backdrop-blur-sm">
        {sortedPolls.map((poll) => {
          const hasVoted = Boolean(
            (poll.user_voted_options && poll.user_voted_options.length > 0) ||
            isPollVotedLocally(poll.id)
          );

          return (
            <Link
              key={poll.id}
              href={`/sondages#poll-${poll.id}`}
              className={`group relative flex items-center justify-between gap-3 p-3 transition-all duration-200 active:scale-[0.99] ${
                hasVoted
                  ? "hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10"
                  : "hover:bg-sps-violet600/10 dark:hover:bg-sps-violet600/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                    hasVoted
                      ? "bg-emerald-600 shadow-emerald-600/30"
                      : "bg-sps-violet600 shadow-violet-600/30"
                  }`}
                >
                  <Icon name={hasVoted ? "check" : "poll"} size={15} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
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
                      ({poll.total_voters} votant{poll.total_voters > 1 ? "s" : ""})
                    </span>
                  </div>
                  <p className="truncate text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                    {poll.question}
                  </p>
                </div>
              </div>

              <span
                className={`flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold shadow-xs transition flex-shrink-0 ${
                  hasVoted
                    ? "bg-neutral-100 text-emerald-700 group-hover:bg-white dark:bg-white/10 dark:text-emerald-300"
                    : "bg-neutral-100 text-sps-violet700 group-hover:bg-white dark:bg-white/10 dark:text-white"
                }`}
              >
                <span>{hasVoted ? "Résultats" : "Voter"}</span>
                <Icon name="chevR" size={12} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
