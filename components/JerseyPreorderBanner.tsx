import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icons";

export function JerseyPreorderBanner() {
  return (
    <div className="px-5 pb-3">
      <Link
        href="/precommandes"
        prefetch={true}
        className="group relative isolate flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1047] via-[#421568] to-[#1C0A30] p-4 text-white shadow-card transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
      >
        {/* Lueur d'ambiance propre en radial-gradient avec fondu sans banding noir */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(217,70,239,0.30)_0%,rgba(147,51,234,0.15)_45%,rgba(28,10,48,0)_75%)]"
        />

        <div className="relative z-10 flex flex-1 flex-col pr-2">
          {/* Badges sur la même ligne */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
            <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
              Édition 2027
            </div>
            <div className="inline-flex items-center whitespace-nowrap rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">
              Limite pré-commande : 22/11/26
            </div>
          </div>

          <h2 className="mt-2 font-display text-[22px] tracking-wide leading-none text-white">
            COLLECTION SPS 2027
          </h2>

          <p className="mt-1 text-[12px] text-purple-200/80">
            Précommandes ouvertes
          </p>

          <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-fuchsia-300 group-hover:text-fuchsia-200">
            <span>Découvrir la collection</span>
            <Icon name="chevR" size={14} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Miniature du maillot en lévitation avec son halo lumineux dédié centré */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
          {/* Lueur lumineuse centrée exactement derrière le maillot */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2.5 rounded-full bg-gradient-to-tr from-fuchsia-500/60 via-purple-500/50 to-[#AA26FF]/60 blur-xl opacity-90 transition-all duration-300 group-hover:scale-115 group-hover:opacity-100 animate-banner-aura will-change-transform"
          />

          {/* Maillot flottant en lévitation 3D continue */}
          <div className="relative h-24 w-20 transition-transform duration-300 group-hover:scale-110 animate-float-small will-change-transform">
            <Image
              src="/images/maillot-sps.webp"
              alt="Maillot SPS"
              fill
              sizes="80px"
              className="object-contain drop-shadow-md"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
