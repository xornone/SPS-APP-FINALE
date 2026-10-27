"use client";

import { useEffect, useState, useId } from "react";

// Date limite officielle : 22 novembre 2026 à 23h59:59 (Europe/Paris)
const DEADLINE = new Date("2026-11-22T23:59:59+01:00").getTime();
// Campagne estimée sur 30 jours pour la jauge de progression des jours
const TOTAL_CAMPAIGN_DAYS = 30;

interface DialProps {
  value: number;
  max: number;
  label: string;
  size: number;
  strokeWidth: number;
  gradientId: string;
}

function CircularDial({
  value,
  max,
  label,
  size,
  strokeWidth,
  gradientId,
}: DialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0.04, value / max));
  const strokeDashoffset = circumference * (1 - progress);

  // Tailles adaptatives selon le diamètre
  const isMini = size <= 36;
  const isCompact = size <= 54;
  const valueFontSize = isMini ? "text-[10.5px]" : isCompact ? "text-[14px]" : "text-[19px]";
  const labelFontSize = isMini
    ? "text-[6px] tracking-wider"
    : isCompact
    ? "text-[7.5px] tracking-wide"
    : "text-[8px] tracking-normal";

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="50%" stopColor="#E879F9" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Fond du cadran */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
          fill="rgba(255, 255, 255, 0.02)"
        />

        {/* Arc lumineux progressif */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{
            filter: isMini
              ? "drop-shadow(0 0 2.5px rgba(232, 121, 249, 0.65))"
              : "drop-shadow(0 0 4px rgba(232, 121, 249, 0.65))",
          }}
        />
      </svg>

      {/* Contenu textuel centré */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-1">
        <span
          className={`font-display font-bold leading-none text-white tabular-nums ${valueFontSize} drop-shadow-sm`}
        >
          {String(value).padStart(2, "0")}
        </span>
        <span
          className={`font-bold uppercase text-purple-200/85 leading-none ${labelFontSize} ${isMini ? "mt-0.5" : "mt-1"}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

interface PreorderCircularCountdownProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  labels?: "fr" | "en";
}

export function PreorderCircularCountdown({
  size = 52,
  strokeWidth = 3.5,
  className = "",
  labels = "fr",
}: PreorderCircularCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  const baseId = useId();

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = DEADLINE - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        setMounted(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
      setMounted(true);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const isMini = size <= 36;
  const gapClass = isMini ? "gap-1.5 sm:gap-2" : "gap-2.5 sm:gap-3.5";

  const labelTexts =
    labels === "en"
      ? {
          days: isMini ? "D" : "DAYS",
          hours: isMini ? "H" : "HOURS",
          mins: isMini ? "M" : size <= 54 ? "MINS" : "MINUTES",
          secs: isMini ? "S" : size <= 54 ? "SECS" : "SECONDS",
        }
      : {
          days: isMini ? "J" : "JOURS",
          hours: isMini ? "H" : "HEURES",
          mins: isMini ? "M" : size <= 54 ? "MIN" : "MINUTES",
          secs: isMini ? "S" : size <= 54 ? "SEC" : "SECONDES",
        };

  if (!mounted) {
    // Calcul approximatif SSR pour un affichage cohérent avant hydratation client
    const SSR_FALLBACK_NOW = new Date("2026-10-27T12:00:00+01:00").getTime();
    const approxDiff = Math.max(0, DEADLINE - SSR_FALLBACK_NOW);
    const approxDays = Math.floor(approxDiff / (1000 * 60 * 60 * 24));
    const approxHours = Math.floor((approxDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const approxMins = Math.floor((approxDiff % (1000 * 60 * 60)) / (1000 * 60));
    const approxSecs = Math.floor((approxDiff % (1000 * 60)) / 1000);
    return (
      <div className={`flex items-center justify-center ${gapClass} ${className}`}>
        <CircularDial
          value={approxDays}
          max={TOTAL_CAMPAIGN_DAYS}
          label={labelTexts.days}
          size={size}
          strokeWidth={strokeWidth}
          gradientId={`${baseId}-days`}
        />
        <CircularDial
          value={approxHours}
          max={24}
          label={labelTexts.hours}
          size={size}
          strokeWidth={strokeWidth}
          gradientId={`${baseId}-hours`}
        />
        <CircularDial
          value={approxMins}
          max={60}
          label={labelTexts.mins}
          size={size}
          strokeWidth={strokeWidth}
          gradientId={`${baseId}-mins`}
        />
        <CircularDial
          value={approxSecs}
          max={60}
          label={labelTexts.secs}
          size={size}
          strokeWidth={strokeWidth}
          gradientId={`${baseId}-secs`}
        />
      </div>
    );
  }

  if (timeLeft.expired) {
    return (
      <div className={`inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70 ${className}`}>
        Précommandes closes
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${gapClass} ${className}`}>
      <CircularDial
        value={timeLeft.days}
        max={TOTAL_CAMPAIGN_DAYS}
        label={labelTexts.days}
        size={size}
        strokeWidth={strokeWidth}
        gradientId={`${baseId}-days`}
      />
      <CircularDial
        value={timeLeft.hours}
        max={24}
        label={labelTexts.hours}
        size={size}
        strokeWidth={strokeWidth}
        gradientId={`${baseId}-hours`}
      />
      <CircularDial
        value={timeLeft.minutes}
        max={60}
        label={labelTexts.mins}
        size={size}
        strokeWidth={strokeWidth}
        gradientId={`${baseId}-mins`}
      />
      <CircularDial
        value={timeLeft.seconds}
        max={60}
        label={labelTexts.secs}
        size={size}
        strokeWidth={strokeWidth}
        gradientId={`${baseId}-secs`}
      />
    </div>
  );
}
