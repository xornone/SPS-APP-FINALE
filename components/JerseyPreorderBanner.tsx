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
        className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1047] via-[#421568] to-[#1C0A30] p-4 sm:p-5 text-white shadow-card transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
      >
        {/* Lueur d'ambiance d'arrière-plan */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 rounded-full bg-fuchsia-500/30 blur-3xl transition-transform duration-300 group-hover:scale-110"
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

        {/* Ligne 2 : Titre + Maillot agrandi (+15%) */}
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
          <div className="flex-1 pr-1">
            <h2 className="font-display text-[23px] sm:text-[25px] tracking-wide leading-none text-white">
              COLLECTION SPS 2027
            </h2>
            <p className="mt-1.5 text-[12px] text-purple-200/80">
              Précommandes ouvertes
            </p>
          </div>

          {/* Miniature du maillot agrandie d'environ 15% avec halo néon */}
          <div className="relative flex-shrink-0">
            <div
              aria-hidden="true"
              className="absolute -inset-2 rounded-full bg-fuchsia-500/25 blur-xl -z-10"
            />
            <div className="relative h-[110px] w-[92px] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2">
              <Image
                src="/images/maillot-sps.webp"
                alt="Maillot SPS 2027"
                fill
                sizes="92px"
                priority
                className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]"
              />
            </div>
          </div>
        </div>

        {/* Ligne 3 : Compte à rebours circulaire design façon photo avec nos couleurs */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-center justify-center">
          <PreorderCircularCountdown size={52} strokeWidth={3.5} />
        </div>

        {/* Ligne 4 : Vrai Call To Action percutant et visible */}
        <div className="relative z-10 mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 py-3 px-4 text-center font-bold text-white shadow-[0_4px_20px_rgba(217,70,239,0.45)] transition-all duration-200 group-hover:brightness-110 group-hover:shadow-[0_6px_25px_rgba(217,70,239,0.65)] active:scale-[0.98]">
          <Icon name="sparkles" size={16} className="text-yellow-300 animate-pulse" />
          <span className="text-[13.5px] font-bold tracking-wide">Découvrir la collection</span>
          <Icon name="chevR" size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
