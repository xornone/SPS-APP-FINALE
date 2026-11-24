"use client";

import { memo, useEffect, useRef, useState } from "react";

// Trajectoires de vol en diagonale à travers l'onglet
interface SleighTrajectory {
  startY: number; // en % de la hauteur de la carte
  endY: number;   // en % de la hauteur de la carte
  angle: number;  // inclinaison aérodynamique en degrés
  duration: number; // durée du passage en secondes
}

const FLIGHT_PATTERNS: SleighTrajectory[] = [
  // 1. Grande montée diagonale (bas-gauche -> haut-droite)
  { startY: 82, endY: 10, angle: -20, duration: 5.5 },
  // 2. Descente plongeante (haut-gauche -> bas-droite)
  { startY: 15, endY: 78, angle: 17, duration: 5.2 },
  // 3. Montée centrale (centre-gauche -> haut-droite)
  { startY: 55, endY: 14, angle: -18, duration: 5.4 },
  // 4. Traversée rasante basse en douce ascension
  { startY: 86, endY: 52, angle: -14, duration: 5.6 },
  // 5. Piqué depuis le haut vers le centre
  { startY: 14, endY: 54, angle: 15, duration: 5.2 },
  // 6. Montée douce traversante (centre-bas -> centre-haut)
  { startY: 70, endY: 30, angle: -16, duration: 5.4 },
];

function getRandomFlight(): SleighTrajectory {
  const pattern = FLIGHT_PATTERNS[Math.floor(Math.random() * FLIGHT_PATTERNS.length)];
  const jitterY = (Math.random() - 0.5) * 6;
  const jitterAngle = (Math.random() - 0.5) * 3;
  const jitterDur = (Math.random() - 0.5) * 0.4;
  return {
    startY: Math.max(8, Math.min(88, pattern.startY + jitterY)),
    endY: Math.max(8, Math.min(88, pattern.endY + jitterY)),
    angle: pattern.angle + jitterAngle,
    duration: Math.max(4.8, pattern.duration + jitterDur),
  };
}

// Particules de flocons avec positions, tailles et cadences variées
const SNOWFLAKES = [
  { left: "4%", size: 4, duration: 6.2, delay: 0.2, drift: 10, op: 0.85 },
  { left: "10%", size: 6, duration: 7.8, delay: 2.1, drift: -12, op: 0.95 },
  { left: "16%", size: 3, duration: 5.4, delay: 0.8, drift: 8, op: 0.7 },
  { left: "23%", size: 5, duration: 8.2, delay: 3.2, drift: -14, op: 0.9 },
  { left: "29%", size: 3.5, duration: 6.6, delay: 1.4, drift: 9, op: 0.75 },
  { left: "36%", size: 7, duration: 9.0, delay: 4.1, drift: -10, op: 1 },
  { left: "43%", size: 4, duration: 5.9, delay: 0.5, drift: 13, op: 0.8 },
  { left: "50%", size: 5.5, duration: 7.4, delay: 2.6, drift: -8, op: 0.95 },
  { left: "57%", size: 3, duration: 5.7, delay: 1.1, drift: 11, op: 0.7 },
  { left: "64%", size: 6.5, duration: 8.4, delay: 3.7, drift: -13, op: 0.9 },
  { left: "71%", size: 4, duration: 6.4, delay: 0.9, drift: 8, op: 0.8 },
  { left: "78%", size: 5, duration: 7.6, delay: 2.9, drift: -11, op: 0.95 },
  { left: "85%", size: 3.5, duration: 5.8, delay: 1.7, drift: 12, op: 0.75 },
  { left: "92%", size: 6, duration: 8.6, delay: 4.3, drift: -9, op: 0.9 },
  { left: "97%", size: 4, duration: 6.1, delay: 0.3, drift: 7, op: 0.85 },
];

/**
 * Flocons de neige tombant doucement sur l'onglet ou la page.
 * Purement CSS, ultra-léger, GPU-accéléré, sans bloquer les clics (pointer-events-none).
 */
export const ChristmasSnow = memo(function ChristmasSnow({
  className = "",
  count = 15,
}: {
  className?: string;
  count?: number;
}) {
  const flakes = SNOWFLAKES.slice(0, count);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden z-20 select-none ${className}`}
    >
      <style>{`
        @keyframes spsSnowFall {
          0% {
            top: -6%;
            opacity: 0;
            transform: translateX(0);
          }
          10% {
            opacity: var(--snow-op, 0.85);
          }
          90% {
            opacity: var(--snow-op, 0.85);
          }
          100% {
            top: 104%;
            opacity: 0;
            transform: translateX(var(--drift, 12px));
          }
        }
      `}</style>

      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] dark:shadow-[0_0_8px_rgba(255,255,255,1)]"
          style={
            {
              left: f.left,
              width: `${f.size}px`,
              height: `${f.size}px`,
              "--snow-op": f.op,
              "--drift": `${f.drift}px`,
              animation: `spsSnowFall ${f.duration}s linear infinite`,
              animationDelay: `${f.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
});

/**
 * Silhouette animée du Père Noël et de ses rennes qui volent DANS LE BON SENS
 * et traversent TOUT L'ONGLET EN DIAGONALE aléatoire (grandes montées, piqués, traversées centrales)
 * avec inclinaison aérodynamique et sillage d'étoiles magiques ✨.
 */
export const ChristmasSleigh = memo(function ChristmasSleigh({
  className = "",
}: {
  className?: string;
}) {
  const [flight, setFlight] = useState<SleighTrajectory | null>(null);
  const [flightId, setFlightId] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Premier vol quasi immédiat (300ms)
    timeoutRef.current = setTimeout(() => {
      setFlight(getRandomFlight());
      setFlightId((id) => id + 1);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleAnimationEnd() {
    // Repasse en continu : délai quasi immédiat de 1 seconde exactement
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFlight(getRandomFlight());
      setFlightId((id) => id + 1);
    }, 1000);
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden z-25 select-none ${className}`}
    >
      <style>{`
        @keyframes spsDiagonalFly {
          0% {
            left: -150px;
            top: var(--start-y, 80%);
            opacity: 0;
            transform: rotate(var(--flight-angle, -18deg)) scale(0.9);
          }
          4% {
            opacity: 1;
          }
          20% {
            transform: rotate(calc(var(--flight-angle, -18deg) + 2deg)) scale(0.96);
          }
          45% {
            transform: rotate(calc(var(--flight-angle, -18deg) - 2deg)) scale(0.98);
          }
          75% {
            transform: rotate(calc(var(--flight-angle, -18deg) + 1deg)) scale(0.96);
          }
          88% {
            opacity: 1;
          }
          100% {
            left: 108%;
            top: var(--end-y, 15%);
            opacity: 0;
            transform: rotate(var(--flight-angle, -18deg)) scale(0.9);
          }
        }
      `}</style>

      {flight && (
        <div
          key={flightId}
          onAnimationEnd={handleAnimationEnd}
          className="absolute flex items-center gap-1 text-amber-300 dark:text-amber-200"
          style={{
            width: "140px",
            "--start-y": `${flight.startY}%`,
            "--end-y": `${flight.endY}%`,
            "--flight-angle": `${flight.angle}deg`,
            animation: `spsDiagonalFly ${flight.duration}s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
          } as React.CSSProperties}
        >
          {/* Traîneau + Père Noël + Rennes : Rennes devant (à droite), Père Noël derrière (à gauche) */}
          <svg
            viewBox="0 0 170 42"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]"
          >
            {/* Étoiles magiques dans le sillage (derrière le traîneau à gauche) */}
            <g className="text-amber-300">
              <path
                d="M6 18L7.5 13L9 18L14 19.5L9 21L7.5 26L6 21L1 19.5L6 18Z"
                fill="currentColor"
                className="animate-pulse opacity-90"
              />
              <circle cx="16" cy="14" r="1.5" fill="#FFE082" />
              <circle cx="21" cy="22" r="1.2" fill="#FFFFFF" />
              <circle cx="26" cy="17" r="1.5" fill="#FFE082" />
            </g>

            {/* Ligne d'attelage / rênes reliant le traîneau aux rennes */}
            <path
              d="M48 24 C 65 25, 90 22, 115 19 M 115 19 C 130 18, 142 16, 155 14"
              stroke="#F59E0B"
              strokeWidth="0.8"
              strokeDasharray="2 1"
              opacity="0.85"
            />

            {/* Traîneau du Père Noël (suit les rennes) */}
            <g transform="translate(24, 10)">
              {/* Patin du traîneau doré avec boucle relevée */}
              <path
                d="M2 19 C 10 19, 28 19, 32 19 C 35 19, 37 16, 35 13 C 33 11, 30 14, 32 16"
                stroke="#F59E0B"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Montants du patin */}
              <path d="M8 19 L11 15 M22 19 L20 15" stroke="#F59E0B" strokeWidth="1.2" />

              {/* Corps du traîneau rouge velours */}
              <path
                d="M6 14 C 6 14, 4 8, 12 7 C 18 7, 24 9, 28 11 C 30 12, 29 15, 27 15 L 7 15 Z"
                fill="#E11D48"
                stroke="#BE123C"
                strokeWidth="0.8"
              />

              {/* Sac de cadeaux à l'arrière */}
              <path
                d="M7 11 C 6 6, 12 3, 15 7 C 17 5, 21 8, 19 12 Z"
                fill="#F59E0B"
                opacity="0.95"
              />

              {/* Père Noël */}
              <circle cx="20" cy="8" r="4.5" fill="#E11D48" />
              <path d="M19 8 C 19 11, 23 11, 23 8 Z" fill="#FFFFFF" />
              <circle cx="21" cy="5.5" r="2.2" fill="#FCD34D" />
              <path d="M19 5 C 20 2, 24 2, 23 5 Z" fill="#E11D48" />
              <circle cx="24" cy="2.5" r="1.1" fill="#FFFFFF" />
              {/* Bras levé qui salue vers l'avant */}
              <path
                d="M20 7 C 23 5, 25 3, 25 1"
                stroke="#E11D48"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="25" cy="1" r="1" fill="#FFFFFF" />
            </g>

            {/* Renne 1 (milieu) */}
            <g transform="translate(95, 6)">
              <path
                d="M5 14 C 7 11, 14 11, 17 13 L 20 10 L 21 7 L 23 7 L 22 11 L 18 15 C 16 16, 8 16, 5 14 Z"
                fill="#D97706"
              />
              <circle cx="22.5" cy="7.5" r="2.2" fill="#D97706" />
              <circle cx="24.2" cy="7.8" r="0.8" fill="#EF4444" />
              <path
                d="M21 5.5 L 19 2 M 20 3.5 L 22 2 M 21 4 L 20 1"
                stroke="#78350F"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M17 14 L 21 17 M 18 13 L 23 15"
                stroke="#D97706"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path
                d="M7 14 L 2 17 M 6 13 L 1 14"
                stroke="#D97706"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </g>

            {/* Renne 2 (renne de tête avec Rudolph au nez rouge) */}
            <g transform="translate(132, 2)">
              <path
                d="M5 14 C 7 11, 14 11, 17 13 L 20 10 L 21 7 L 23 7 L 22 11 L 18 15 C 16 16, 8 16, 5 14 Z"
                fill="#D97706"
              />
              <circle cx="22.5" cy="7.5" r="2.2" fill="#D97706" />
              <circle cx="24.4" cy="7.8" r="1.1" fill="#DC2626" />
              <path
                d="M21 5.5 L 19 2 M 20 3.5 L 22 2 M 21 4 L 20 1"
                stroke="#78350F"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M17 14 L 22 17 M 18 13 L 24 14"
                stroke="#D97706"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path
                d="M7 14 L 2 18 M 6 13 L 1 15"
                stroke="#D97706"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
});

/**
 * Petite ampoule de Noël colorée avec filament et halo lumineux.
 */
function ChristmasBulb({
  color,
  glow,
  phase = 1,
  angle = 0,
}: {
  color: string;
  glow: string;
  phase?: 1 | 2 | 3;
  angle?: number;
}) {
  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{
        transform: `rotate(${angle}deg)`,
        animation: `spsGarlandTwinkle${phase} ${1.8 + phase * 0.4}s ease-in-out infinite`,
      }}
    >
      {/* Douille métallique */}
      <div className="h-1.5 w-1.5 rounded-t-xs bg-neutral-600 dark:bg-neutral-400" />
      {/* Ampoule en forme de goutte étincelante */}
      <div
        className="h-3 w-2.5 rounded-b-full rounded-t-xs"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 9px 2px ${glow}`,
        }}
      >
        {/* Reflet de brillance */}
        <div className="ml-0.5 mt-0.5 h-1 w-0.5 rounded-full bg-white/80" />
      </div>
    </div>
  );
}

/**
 * Ornement de coin festif (branches de houx + baies rouges)
 */
function CornerHolly({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const rotation =
    position === "tl"
      ? "rotate-0"
      : position === "tr"
        ? "rotate-90"
        : position === "br"
          ? "rotate-180"
          : "-rotate-90";

  return (
    <div className={`absolute ${position === "tl" ? "top-1 left-1" : position === "tr" ? "top-1 right-1" : position === "bl" ? "bottom-1 left-1" : "bottom-1 right-1"} z-35 ${rotation}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
        {/* Feuilles de houx vert sapin */}
        <path
          d="M2 12 C 4 6, 10 3, 13 2 C 10 7, 13 11, 10 14 C 7 13, 3 15, 2 12 Z"
          fill="#15803D"
        />
        <path
          d="M12 2 C 16 4, 19 10, 20 13 C 15 10, 11 13, 8 10 C 9 7, 7 3, 12 2 Z"
          fill="#166534"
        />
        {/* Baies rouges de Noël */}
        <circle cx="10" cy="10" r="2.2" fill="#DC2626" />
        <circle cx="13" cy="11.5" r="2" fill="#EF4444" />
        <circle cx="11.5" cy="8" r="1.8" fill="#B91C1C" />
      </svg>
    </div>
  );
}

/**
 * Guirlande lumineuse complète qui entoure la carte de sortie comme sur un sapin de Noël.
 * Ampoules multicolores (rouge, or, vert, violet SPS, bleu) réparties sur le pourtour
 * avec branche de houx aux 4 coins et scintillement enchanteur.
 */
export const ChristmasGarland = memo(function ChristmasGarland() {
  const bulbColors: { color: string; glow: string; phase: 1 | 2 | 3 }[] = [
    { color: "#EF4444", glow: "rgba(239, 68, 68, 0.9)", phase: 1 }, // Rouge
    { color: "#F59E0B", glow: "rgba(245, 158, 11, 0.9)", phase: 2 }, // Or chaud
    { color: "#10B981", glow: "rgba(16, 185, 129, 0.9)", phase: 3 }, // Vert sapin
    { color: "#AA26FF", glow: "rgba(170, 38, 255, 0.95)", phase: 1 }, // Violet SPS
    { color: "#38BDF8", glow: "rgba(56, 189, 248, 0.9)", phase: 2 }, // Bleu givré
    { color: "#F43F5E", glow: "rgba(244, 63, 94, 0.9)", phase: 3 }, // Rose
    { color: "#FBBF24", glow: "rgba(251, 191, 36, 0.9)", phase: 1 }, // Jaune
    { color: "#10B981", glow: "rgba(16, 185, 129, 0.9)", phase: 2 }, // Vert
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden rounded-[32px]"
    >
      <style>{`
        @keyframes spsGarlandTwinkle1 {
          0%, 100% { opacity: 0.35; transform: scale(0.88); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes spsGarlandTwinkle2 {
          0%, 100% { opacity: 1; transform: scale(1.12); }
          50% { opacity: 0.35; transform: scale(0.88); }
        }
        @keyframes spsGarlandTwinkle3 {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          35% { opacity: 0.35; transform: scale(0.88); }
          70% { opacity: 1; transform: scale(1.14); }
        }
      `}</style>

      {/* Câble de guirlande vert sapin festif tout autour de la bordure */}
      <div className="absolute inset-[3px] rounded-[29px] border-2 border-dashed border-emerald-800/35 dark:border-emerald-500/35" />

      {/* 4 coins avec houx et baies */}
      <CornerHolly position="tl" />
      <CornerHolly position="tr" />
      <CornerHolly position="bl" />
      <CornerHolly position="br" />

      {/* Guirlande du HAUT (ampoules pendantes) */}
      <div className="absolute inset-x-6 -top-0.5 flex items-start justify-between">
        {bulbColors.slice(0, 7).map((b, idx) => (
          <ChristmasBulb
            key={`top-${idx}`}
            color={b.color}
            glow={b.glow}
            phase={b.phase}
            angle={((idx % 3) - 1) * 8}
          />
        ))}
      </div>

      {/* Guirlande du BAS (ampoules pendantes) */}
      <div className="absolute inset-x-6 -bottom-1 flex items-end justify-between">
        {bulbColors.slice(1, 8).map((b, idx) => (
          <ChristmasBulb
            key={`bottom-${idx}`}
            color={b.color}
            glow={b.glow}
            phase={b.phase}
            angle={((idx % 3) - 1) * -8}
          />
        ))}
      </div>

      {/* Guirlande de GAUCHE (ampoules latérales) */}
      <div className="absolute inset-y-12 -left-1 flex flex-col justify-between">
        {[bulbColors[2], bulbColors[0], bulbColors[4], bulbColors[1]].map((b, idx) => (
          <div key={`left-${idx}`} className="-rotate-90">
            <ChristmasBulb color={b.color} glow={b.glow} phase={b.phase} />
          </div>
        ))}
      </div>

      {/* Guirlande de DROITE (ampoules latérales) */}
      <div className="absolute inset-y-12 -right-1 flex flex-col justify-between">
        {[bulbColors[3], bulbColors[1], bulbColors[5], bulbColors[2]].map((b, idx) => (
          <div key={`right-${idx}`} className="rotate-90">
            <ChristmasBulb color={b.color} glow={b.glow} phase={b.phase} />
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Liseré délicat de neige déposée sur le bord supérieur de la carte.
 */
export const ChristmasSnowCap = memo(function ChristmasSnowCap() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-[1px] z-30 flex justify-between overflow-hidden px-8 select-none"
    >
      <svg
        viewBox="0 0 320 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-2.5 w-full text-white/90 drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)]"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0 L320 0 L320 3 C290 5, 275 8, 255 4 C235 0, 220 7, 200 4 C180 1, 165 7, 140 3 C120 -1, 105 8, 85 4 C65 0, 45 6, 25 3 C10 1, 5 3, 0 2 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
});

/**
 * Bannière festive dédiée pour la page détaillée de la sortie /rides/[id]
 */
export const ChristmasDetailBanner = memo(function ChristmasDetailBanner() {
  return (
    <div className="relative mx-5 mb-1 overflow-hidden rounded-[26px] border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#1E0938] to-violet-950/60 p-4 shadow-[0_12px_28px_-6px_rgba(225,29,72,0.22)] dark:border-rose-400/30 dark:from-rose-950/50 dark:via-[#1B0B2E] dark:to-[#0D0418]">
      {/* Guirlande lumineuse autour de la bannière */}
      <ChristmasGarland />

      {/* Flocons internes dans la bannière */}
      <ChristmasSnow count={10} />

      <div className="relative z-10 flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-xl shadow-md shadow-rose-600/30">
          🎅
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-rose-300 dark:text-rose-200">
              🎄 ÉDITION SPÉCIALE NOËL
            </span>
            <span className="text-[11px] font-bold text-amber-300">
              ✨ Sortie Conviviale SPS
            </span>
          </div>

          <h2 className="mt-1 font-display text-[19px] tracking-wide text-white">
            Pull moche de Noël & bonne humeur bienvenus !
          </h2>

          <p className="mt-1 text-[12.5px] leading-relaxed text-white/80">
            Une sortie à allure tranquille, ouverte à tous les membres et amis du club. On roule ensemble, on rentre ensemble, et on partage un café au Marché du Lez pour fêter la fin d&apos;année !
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] font-bold text-amber-200/90">
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/25 px-2 py-1 backdrop-blur-xs">
              📍 Marché du Lez
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/25 px-2 py-1 backdrop-blur-xs">
              🕘 9h00
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/25 px-2 py-1 backdrop-blur-xs">
              ☕ Café & viennoiseries
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
