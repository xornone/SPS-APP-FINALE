import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Précommandes Maillot SPS 2027 — Modèle CX SCA",
  description: "Découvrez et précommandez le nouveau maillot officiel SPS 2027 modèle Gobik CX SCA, l'évolution directe du CX PRO 4.0 de 2026.",
};

const HELLO_ASSO_URL = "https://www.helloasso.com/associations/sps/boutiques/equipement-sps";
const GOBIK_FITTING_GUIDE_URL = "https://gobik.com/fr/pages/fitting-guide";

export default function PrecommandesPage() {
  return (
    <div className="relative min-h-[calc(100dvh-70px)] overflow-hidden bg-gradient-to-b from-[#1C0D2E] via-[#120720] to-[#0A0413] text-white">
      {/* Halos lumineux d'ambiance d'inspiration Apple Keynote */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-600/35 via-violet-600/25 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-96 right-[-10%] -z-10 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-40 left-[-15%] -z-10 h-72 w-72 rounded-full bg-purple-700/20 blur-3xl"
      />

      {/* En-tête du reveal */}
      <div className="px-5 pt-7 pb-2 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
          Édition 2027 · Collection Officielle
        </div>

        <h1 className="mt-4 font-display text-4xl tracking-wider text-white drop-shadow-sm sm:text-5xl">
          MAILLOT SPS · CX SCA
        </h1>
        <p className="mt-1 font-semibold text-[13px] uppercase tracking-widest text-fuchsia-400/90">
          GOBIK · L’Évolution du CX PRO 4.0 (2026)
        </p>
        <p className="mx-auto mt-2 max-w-xs text-[13.5px] font-medium leading-relaxed text-purple-200/80">
          « Le maillot qui vous fait vous sentir rapide dès le premier instant. »
        </p>
      </div>

      {/* Vitrine Produit : Maillot Flottant et Cliquable vers HelloAsso */}
      <div className="relative mx-auto mt-4 max-w-sm px-6">
        <Link
          href={HELLO_ASSO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Lueur dynamique derrière le maillot */}
          <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-gradient-to-tr from-fuchsia-600/40 via-purple-600/40 to-blue-500/30 opacity-75 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

          {/* Image du maillot */}
          <div className="relative flex items-center justify-center py-2">
            <Image
              src="/images/maillot-sps.png"
              alt="Nouveau maillot officiel SPS 2027 Gobik CX SCA"
              width={727}
              height={1024}
              priority
              className="h-auto w-full max-w-[290px] drop-shadow-[0_20px_35px_rgba(168,85,247,0.45)] transition-all duration-500 group-hover:drop-shadow-[0_25px_45px_rgba(217,70,239,0.65)]"
            />
          </div>

          {/* Badge interactif sur le produit */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur-md transition-colors group-hover:border-fuchsia-400 group-hover:bg-fuchsia-950/80">
            <span>Pré-commander</span>
            <Icon name="external" size={13} className="text-fuchsia-300" />
          </div>
        </Link>
      </div>

      {/* Barre des 4 métriques clés façon Apple Specs */}
      <div className="mt-7 px-5">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center backdrop-blur-md">
          <div className="flex flex-col items-center">
            <span className="font-display text-lg tracking-wide text-white">123 g</span>
            <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">Poids (M)</span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="font-display text-lg tracking-wide text-white">UPF 50</span>
            <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">Anti-UV</span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="font-display text-lg tracking-wide text-white">22-35°C</span>
            <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">Température</span>
          </div>

          <Link
            href={GOBIK_FITTING_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center border-l border-white/10"
          >
            <span className="flex items-center gap-0.5 font-display text-lg tracking-wide text-fuchsia-300 group-hover:text-fuchsia-200">
              FIT ↗
            </span>
            <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">Perfect Fit</span>
          </Link>
        </div>
      </div>

      {/* Bouton d'action principal (CTA Apple-like) */}
      <div className="mt-5 px-5">
        <Link
          href={HELLO_ASSO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 p-[1px] shadow-[0_10px_30px_-10px_rgba(217,70,239,0.5)] transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-gradient-to-r from-[#8B1FA9] to-[#5B21B6] py-3.5 px-6 font-semibold text-white">
            <Icon name="sparkles" size={18} className="text-yellow-300 animate-pulse" />
            <span className="text-[15px] font-bold tracking-wide">Pré-commander sur HelloAsso</span>
            <Icon name="external" size={16} />
          </div>
        </Link>
        <p className="mt-2 text-center text-[11.5px] text-white/50">
          Paiement sécurisé et sélection des tailles sur notre boutique club
        </p>
      </div>

      {/* Récit de conception (Texte officiel Gobik) */}
      <div className="mt-8 px-5">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-fuchsia-400">
            <Icon name="shirt" size={18} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">
              Modèle CX SCA · L’Évolution du CX PRO 4.0
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-purple-100/90 font-medium">
            Après notre maillot CX PRO 4.0 porté en 2026, place au nouveau <strong>CX SCA</strong>. Une nouvelle version développée pour ceux qui recherchent une sensation plus aérodynamique, stable et épurée sur le vélo, sans renoncer au confort qui en fait un vêtement d’usage récurrent.
          </p>

          <p className="mt-2.5 text-[12.5px] leading-relaxed text-purple-200/70">
            Sa nouvelle construction avec des manches aérodynamiques améliore l’adaptation au bras, réduit le mouvement du tissu et procure une sensation d’ajustement plus précise lorsque la vitesse augmente.
          </p>
        </div>
      </div>


      {/* Guide des tailles & Lien Perfect Fit Gobik */}
      <div className="mt-6 mb-8 px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-bold text-fuchsia-300">
                i
              </span>
              <span className="text-[13px] font-bold text-white">Coupe Gobik : PERFECT FIT</span>
            </div>
            <Link
              href={GOBIK_FITTING_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-fuchsia-300 hover:text-fuchsia-200"
            >
              <span>Guide Gobik</span>
              <Icon name="external" size={12} />
            </Link>
          </div>

          <p className="mt-2.5 text-[12px] leading-relaxed text-white/70">
            La coupe <strong>PERFECT FIT</strong> de Gobik offre un équilibre optimal entre performance aérodynamique et confort au long cours. Le vêtement épouse le buste et réduit les mouvements de tissu sans comprimer.
          </p>
        </div>
      </div>
    </div>
  );
}
