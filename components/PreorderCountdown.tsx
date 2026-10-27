"use client";

import { useEffect, useState } from "react";

// Date limite officielle : 22 novembre 2026 à 23h59:59 (Europe/Paris)
const DEADLINE = new Date("2026-11-22T23:59:59+01:00").getTime();

interface PreorderCountdownProps {
  className?: string;
}

export function PreorderCountdown({ className = "" }: PreorderCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    expired: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = DEADLINE - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
        setMounted(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes, expired: false });
      setMounted(true);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  // Rendu initial (SSR / avant hydratation)
  if (!mounted) {
    // Calcul approximatif pour affichage instantané sans saut visuel
    const approxDiff = Math.max(0, DEADLINE - 1730024700000);
    const approxDays = Math.floor(approxDiff / (1000 * 60 * 60 * 24));
    return (
      <div
        className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
        <span className="tabular-nums">
          {approxDays}J / --H / --M
        </span>
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

  return (
    <div
      className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
      <span className="tabular-nums">
        {timeLeft.days}J / {pad(timeLeft.hours)}H / {pad(timeLeft.minutes)}M
      </span>
    </div>
  );
}
