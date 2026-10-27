"use client";

import { useEffect, useState } from "react";

// Date limite officielle : 22 novembre 2026 à 23h59:59 (Europe/Paris)
// En JavaScript Date ISO avec offset UTC+1 (CET en novembre)
const DEADLINE = new Date("2026-11-22T23:59:59+01:00").getTime();

interface PreorderCountdownProps {
  className?: string;
  showSeconds?: boolean;
  prefix?: string;
}

export function PreorderCountdown({
  className = "",
  showSeconds = true,
  prefix = "J-",
}: PreorderCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = DEADLINE - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rendu initial (SSR et avant montage client) pour éviter tout décalage d'hydratation
  if (!timeLeft) {
    return (
      <div
        className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
        <span className="tabular-nums">J-26 · Compte à rebours</span>
      </div>
    );
  }

  if (timeLeft.expired) {
    return (
      <div
        className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60 ${className}`}
      >
        Précommandes closes
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
      <span className="tabular-nums">
        {prefix}
        {timeLeft.days} · {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m
        {showSeconds ? ` ${pad(timeLeft.seconds)}s` : ""}
      </span>
    </div>
  );
}
