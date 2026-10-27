import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icons";
import { PreorderCircularCountdown } from "./PreorderCircularCountdown";

export function JerseyPreorderBanner() {
  return (
    <div className="px-5 pb-3">
      <Link
        href="/precommandes"
        prefetch={true}
        className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1047] via-[#421568] to-[#1C0A30] p-4 text-white shadow-card transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
      >
        {/* Lueur d'ambiance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-2xl transition-transform duration-300 group-hover:scale-110"
        />

        {/* Ligne 1 : Badges sur la même ligne adapté pour que ça rentre */}
        <div className="relative z-10 flex items-center gap-1.5 flex-nowrap overflow-hidden">
          <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
            Édition 2027
          </div>
          <div className="inline-flex items-center whitespace-nowrap rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
            Limite pré-commande : 22/11/26
          </div>
        </div>

        {/* Ligne 2 : Titre + Miniature maillot */}
        <div className="relative z-10 mt-2.5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] tracking-wide leading-none text-white">
              COLLECTION SPS 2027
            </h2>
            <p className="mt-1 text-[12px] text-purple-200/80">
              Précommandes ouvertes
            </p>
          </div>

          <div className="relative h-16 w-14 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2">
            <Image
              src="/images/maillot-sps.webp"
              alt="Maillot SPS"
              fill
              sizes="60px"
              className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Ligne 3 : Compte à rebours circulaire design façon photo avec nos couleurs */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-center justify-center">
          <PreorderCircularCountdown size={50} strokeWidth={3.5} />
        </div>

        {/* Ligne 4 : Call to Action bas */}
        <div className="relative z-10 mt-3 flex items-center justify-between text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200">
          <span>Découvrir la collection</span>
          <Icon name="chevR" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </div>
  );
}
