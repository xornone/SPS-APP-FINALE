"use client";

import { memo } from "react";

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
        @keyframes spsSnowPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
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
 * Silhouette animée du traîneau du Père Noël tiré par ses rennes
 * qui traverse le haut de l'onglet toutes les 16 secondes.
 */
export const ChristmasSleigh = memo(function ChristmasSleigh({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-1.5 h-10 overflow-hidden z-25 select-none ${className}`}
    >
      <style>{`
        @keyframes spsFlySleigh {
          0% {
            left: 108%;
            opacity: 0;
            transform: translateY(0) scale(0.92);
          }
          3% {
            opacity: 1;
          }
          15% {
            transform: translateY(-3px) scale(0.95);
          }
          28% {
            transform: translateY(2px) scale(0.97);
          }
          40% {
            transform: translateY(-4px) scale(0.96);
          }
          48% {
            opacity: 1;
          }
          52% {
            left: -35%;
            opacity: 0;
            transform: translateY(0) scale(0.92);
          }
          100% {
            left: -35%;
            opacity: 0;
          }
        }
        @keyframes spsStarTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div
        className="absolute top-0 flex items-center gap-1 text-amber-300 dark:text-amber-200"
        style={{
          width: "140px",
          animation: "spsFlySleigh 17s cubic-bezier(0.25, 0.1, 0.25, 1) infinite",
        }}
      >
        {/* Traîneau + Père Noël + Rennes en SVG ultra net */}
        <svg
          viewBox="0 0 170 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]"
        >
          {/* Étoiles magiques dans le sillage */}
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

          {/* Ligne d'attelage / rênes */}
          <path
            d="M48 24 C 65 25, 90 22, 115 19 M 115 19 C 130 18, 142 16, 155 14"
            stroke="#F59E0B"
            strokeWidth="0.8"
            strokeDasharray="2 1"
            opacity="0.85"
          />

          {/* Traîneau du Père Noël */}
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

            {/* Corps du traîneau rouge/velours */}
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
            {/* Corps manteau rouge */}
            <circle cx="20" cy="8" r="4.5" fill="#E11D48" />
            {/* Barbe blanche */}
            <path d="M19 8 C 19 11, 23 11, 23 8 Z" fill="#FFFFFF" />
            {/* Tête */}
            <circle cx="21" cy="5.5" r="2.2" fill="#FCD34D" />
            {/* Bonnet rouge avec pompon blanc */}
            <path d="M19 5 C 20 2, 24 2, 23 5 Z" fill="#E11D48" />
            <circle cx="24" cy="2.5" r="1.1" fill="#FFFFFF" />
            {/* Bras qui fait coucou 👋 */}
            <path
              d="M18 7 C 15 5, 14 3, 15 2"
              stroke="#E11D48"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="15" cy="2" r="1" fill="#FFFFFF" />
          </g>

          {/* Renne 1 (proche du traîneau) */}
          <g transform="translate(95, 6)">
            {/* Corps du renne */}
            <path
              d="M5 14 C 7 11, 14 11, 17 13 L 20 10 L 21 7 L 23 7 L 22 11 L 18 15 C 16 16, 8 16, 5 14 Z"
              fill="#D97706"
            />
            {/* Tête et museau */}
            <circle cx="22.5" cy="7.5" r="2.2" fill="#D97706" />
            <circle cx="24.2" cy="7.8" r="0.8" fill="#EF4444" /> {/* Nez rouge de Rudolph */}
            {/* Bois du renne */}
            <path
              d="M21 5.5 L 19 2 M 20 3.5 L 22 2 M 21 4 L 20 1"
              stroke="#78350F"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            {/* Pattes avant bondissantes */}
            <path
              d="M17 14 L 21 17 M 18 13 L 23 15"
              stroke="#D97706"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Pattes arrière en extension */}
            <path
              d="M7 14 L 2 17 M 6 13 L 1 14"
              stroke="#D97706"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>

          {/* Renne 2 (renne de tête) */}
          <g transform="translate(132, 2)">
            {/* Corps du renne */}
            <path
              d="M5 14 C 7 11, 14 11, 17 13 L 20 10 L 21 7 L 23 7 L 22 11 L 18 15 C 16 16, 8 16, 5 14 Z"
              fill="#D97706"
            />
            {/* Tête et museau avec nez rouge lumineux */}
            <circle cx="22.5" cy="7.5" r="2.2" fill="#D97706" />
            <circle cx="24.4" cy="7.8" r="1.1" fill="#DC2626" />
            {/* Bois du renne */}
            <path
              d="M21 5.5 L 19 2 M 20 3.5 L 22 2 M 21 4 L 20 1"
              stroke="#78350F"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            {/* Pattes avant bondissantes */}
            <path
              d="M17 14 L 22 17 M 18 13 L 24 14"
              stroke="#D97706"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Pattes arrière en extension */}
            <path
              d="M7 14 L 2 18 M 6 13 L 1 15"
              stroke="#D97706"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        </svg>
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
