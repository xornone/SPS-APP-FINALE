"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";

const HELLO_ASSO_URL = "https://www.helloasso.com/associations/sps/boutiques/equipement-sps";
const GOBIK_FITTING_GUIDE_URL = "https://gobik.com/fr/pages/fitting-guide";

interface ArticleItem {
  id: string;
  tabLabel: string;
  icon: "shirt" | "sparkles" | "thermometer" | "wind";
  badge: string;
  title: string;
  subtitle: string;
  quote: string;
  image: string;
  alt: string;
  buttonLabel: string;
  metrics: {
    value: string;
    label: string;
    href?: string;
  }[];
  narrativeBadge: string;
  narrativeP1: string;
  narrativeP2: string;
  featureTitle: string;
  featureGuideText: string;
  featureGuideUrl: string;
  featureDesc: string;
}

const ARTICLES: ArticleItem[] = [
  {
    id: "maillot",
    tabLabel: "Maillot CX SCA",
    icon: "shirt",
    badge: "Édition 2027 · Collection Officielle",
    title: "MAILLOT SPS · CX SCA",
    subtitle: "GOBIK · L’Évolution du CX PRO 4.0 (2026)",
    quote: "« Le maillot qui vous fait vous sentir rapide dès le premier instant. »",
    image: "/images/maillot-sps.png",
    alt: "Nouveau maillot officiel SPS 2027 Gobik CX SCA",
    buttonLabel: "Pré-commander sur HelloAsso",
    metrics: [
      { value: "123 g", label: "Poids (M)" },
      { value: "UPF 50", label: "Anti-UV" },
      { value: "22-35°C", label: "Température" },
      { value: "FIT ↗", label: "Perfect Fit", href: GOBIK_FITTING_GUIDE_URL },
    ],
    narrativeBadge: "Modèle CX SCA · L’Évolution du CX PRO 4.0",
    narrativeP1:
      "Après notre maillot CX PRO 4.0 porté en 2026, place au nouveau CX SCA. Une nouvelle version développée pour ceux qui recherchent une sensation plus aérodynamique, stable et épurée sur le vélo, sans renoncer au confort qui en fait un vêtement d’usage récurrent.",
    narrativeP2:
      "Sa nouvelle construction avec des manches aérodynamiques améliore l’adaptation au bras, réduit le mouvement du tissu et procure une sensation d’ajustement plus précise lorsque la vitesse augmente.",
    featureTitle: "Coupe Gobik : PERFECT FIT",
    featureGuideText: "Guide Gobik",
    featureGuideUrl: GOBIK_FITTING_GUIDE_URL,
    featureDesc:
      "La coupe PERFECT FIT de Gobik offre un équilibre optimal entre performance aérodynamique et confort au long cours. Le vêtement épouse le buste et réduit les mouvements de tissu sans comprimer.",
  },
  {
    id: "cuissard",
    tabLabel: "Cuissard X",
    icon: "sparkles",
    badge: "Édition 2027 · Collection Officielle",
    title: "CUISSARD SPS · X",
    subtitle: "GOBIK · Peau Graphène Elastic Interface®",
    quote: "« Performance maximale, coupe franche et sensation seconde peau. »",
    image: "/images/cuissard-sps.png",
    alt: "Nouveau cuissard officiel SPS 2027 Gobik Modèle X",
    buttonLabel: "Pré-commander sur HelloAsso",
    metrics: [
      { value: "165 g", label: "Poids (M)" },
      { value: "UPF 50", label: "Anti-UV" },
      { value: "17-35°C", label: "Température" },
      { value: "PEAU ↗", label: "Graphène", href: GOBIK_FITTING_GUIDE_URL },
    ],
    narrativeBadge: "Modèle X · DUALKNIT PRO & Fil de Graphène",
    narrativeP1:
      "Développé pour offrir des performances maximales, ce cuissard combine un design minimaliste avec des matériaux de dernière génération. Son tissu DUALKNIT PRO, en maille circulaire, garantit une excellente élasticité, opacité, respirabilité et une grande durabilité. La forte présence de polyamide procure un toucher doux et un séchage rapide, en maintenant la peau confortable même lors des sorties prolongées.",
    narrativeP2:
      "Les bretelles ergonomiques, confectionnées avec une coupe franche et des bandes de largeur accrue, intègrent un fil de graphène qui améliore la régulation thermique, neutralise les odeurs et évite l’accumulation d’humidité. Les jambes sans coutures procurent un ajustement précis et éliminent tout point de pression même sur les parcours les plus exigeants.",
    featureTitle: "Peau de chamois : GRAPHENE BY ELASTIC INTERFACE®",
    featureGuideText: "Guide Gobik",
    featureGuideUrl: GOBIK_FITTING_GUIDE_URL,
    featureDesc:
      "Peau de chamois haute performance avec fil de graphène thermorégulateur, bretelles ergonomiques à coupe franche et tissu DUALKNIT PRO pour un maintien d'endurance exceptionnel sans aucune compression.",
  },
  {
    id: "pulse",
    tabLabel: "Maillot Pulse",
    icon: "thermometer",
    badge: "Édition 2027 · Collection Officielle",
    title: "MAILLOT SPS · PULSE",
    subtitle: "GOBIK · Manches Longues Mi-Saison & Hiver",
    quote: "« Chaleur, confort et ajustement régulier pour rouler par temps frais. »",
    image: "/images/maillot-pulse-sps.png",
    alt: "Nouveau maillot manches longues officiel SPS 2027 Gobik Pulse",
    buttonLabel: "Pré-commander sur HelloAsso",
    metrics: [
      { value: "260 g", label: "Poids (M)" },
      { value: "8-16°C", label: "Température" },
      { value: "GRATTÉ", label: "Intérieur thermique" },
      { value: "FIT ↗", label: "Regular Fit", href: GOBIK_FITTING_GUIDE_URL },
    ],
    narrativeBadge: "Modèle Pulse · Manches Longues Hiver & Mi-Saison",
    narrativeP1:
      "Modèle à manches longues conçu pour offrir chaleur et confort lors des sorties par températures fraîches. Son tissu technique avec intérieur gratté retient la chaleur corporelle et permet l’utilisation d’une couche de base sans compromettre l’ajustement. Idéal pour les cyclistes à la recherche d’un vêtement d’hiver polyvalent et adaptable à différentes morphologies.",
    narrativeP2:
      "Il intègre des poignets anatomiquement optimisés avec découpe laser, une fermeture éclair inversée et dissimulée, ainsi que 3 poches arrière avec système GRS breveté et détails réfléchissants sur la poche et le col.",
    featureTitle: "Coupe Gobik : REGULAR FIT",
    featureGuideText: "Guide Gobik",
    featureGuideUrl: GOBIK_FITTING_GUIDE_URL,
    featureDesc:
      "La coupe REGULAR FIT de Gobik offre un ajustement plus classique et polyvalent, idéal pour les entraînements réguliers d'automne et de printemps ou comme seconde couche sous une veste d'hiver.",
  },
  {
    id: "gilet",
    tabLabel: "Gilet Plus 2.0",
    icon: "wind",
    badge: "Édition 2027 · Collection Officielle",
    title: "GILET SPS · PLUS 2.0",
    subtitle: "GOBIK · Coupe-Vent Ultra Léger & Compact",
    quote: "« Protection coupe-vent ultralégère et aérodynamique sans compromis. »",
    image: "/images/gilet-plus-sps.png",
    alt: "Nouveau gilet officiel SPS 2027 Gobik Plus 2.0",
    buttonLabel: "Pré-commander sur HelloAsso",
    metrics: [
      { value: "100 g", label: "Poids (M)" },
      { value: "10-18°C", label: "Température" },
      { value: "COMPACT", label: "Pliable en poche" },
      { value: "FIT ↗", label: "Perfect Fit", href: GOBIK_FITTING_GUIDE_URL },
    ],
    narrativeBadge: "Modèle Plus 2.0 · Protection Coupe-Vent Compacte",
    narrativeP1:
      "Coupe-vent, léger et aérodynamique, conçu pour offrir une protection sans compromettre les performances. Son panneau frontal texturé améliore la dispersion de l’air, tandis que le dos en maille favorise la respirabilité. Le col montant avec zone élastique et les élastiques aux épaules assurent un ajustement parfait.",
    narrativeP2:
      "Il intègre des fermetures à glissière doubles pour réguler la ventilation et de nouvelles ouvertures arrière pour accéder au maillot. Fonctionnalité et performance dans un format compact : il se replie facilement dans sa propre poche latérale.",
    featureTitle: "Coupe Gobik : PERFECT FIT",
    featureGuideText: "Guide Gobik",
    featureGuideUrl: GOBIK_FITTING_GUIDE_URL,
    featureDesc:
      "La coupe PERFECT FIT de Gobik offre un profil ajusté et aérodynamique près du corps pour éliminer toute prise au vent à haute vitesse, tout en garantissant une excellente liberté de mouvement.",
  },
];

export function PreorderShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const article = ARTICLES[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? ARTICLES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === ARTICLES.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative min-h-[calc(100dvh-70px)] overflow-hidden bg-gradient-to-b from-[#1C0D2E] via-[#120720] to-[#0A0413] text-white">
      {/* Halos lumineux d'ambiance Apple Keynote */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-600/35 via-violet-600/25 to-transparent blur-3xl transition-all duration-700"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-96 right-[-10%] -z-10 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-40 left-[-15%] -z-10 h-72 w-72 rounded-full bg-purple-700/20 blur-3xl"
      />

      {/* En-tête du reveal avec sélecteur d'article */}
      <div className="px-5 pt-6 pb-2 text-center">
        {/* Badge officiel 2027 */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
          {article.badge}
        </div>

        {/* Sélecteur carrousel en onglets pill / segmented control */}
        <div className="mt-4 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl sm:rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur-xl shadow-lg">
            {ARTICLES.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative flex items-center gap-1 rounded-full px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_2px_12px_rgba(217,70,239,0.5)]"
                      : "text-purple-200/70 hover:text-white"
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon name={item.icon} size={13} />
                  <span>{item.tabLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Titre et sous-titre de l'article actif */}
        <h1 className="mt-4 font-display text-4xl tracking-wider text-white drop-shadow-sm sm:text-5xl transition-all duration-300">
          {article.title}
        </h1>
        <p className="mt-1 font-semibold text-[13px] uppercase tracking-widest text-fuchsia-400/90">
          {article.subtitle}
        </p>
        <p className="mx-auto mt-2 max-w-xs text-[13.5px] font-medium leading-relaxed text-purple-200/80">
          {article.quote}
        </p>
      </div>

      {/* Vitrine Produit : Carrousel avec Chevrons et Touch Swipe */}
      <div
        className="relative mx-auto mt-3 max-w-sm px-6 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Flèche Gauche (Article précédent) */}
        <button
          onClick={handlePrev}
          aria-label="Article précédent"
          className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/90 backdrop-blur-md transition-all duration-200 hover:border-fuchsia-400 hover:bg-fuchsia-950/70 hover:scale-110 active:scale-95 shadow-md"
        >
          <Icon name="chevL" size={16} />
        </button>

        {/* Flèche Droite (Article suivant) */}
        <button
          onClick={handleNext}
          aria-label="Article suivant"
          className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/90 backdrop-blur-md transition-all duration-200 hover:border-fuchsia-400 hover:bg-fuchsia-950/70 hover:scale-110 active:scale-95 shadow-md"
        >
          <Icon name="chevR" size={16} />
        </button>

        {/* Vêtement cliquable vers HelloAsso */}
        <Link
          href={HELLO_ASSO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Lueur dynamique derrière le produit */}
          <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-gradient-to-tr from-fuchsia-600/40 via-purple-600/40 to-blue-500/30 opacity-75 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

          {/* Image du produit actif */}
          <div className="relative flex items-center justify-center py-2 min-h-[300px]">
            <Image
              key={article.id}
              src={article.image}
              alt={article.alt}
              width={727}
              height={1024}
              priority
              className="h-auto w-full max-w-[285px] drop-shadow-[0_20px_35px_rgba(168,85,247,0.45)] transition-all duration-500 group-hover:drop-shadow-[0_25px_45px_rgba(217,70,239,0.65)]"
            />
          </div>

          {/* Badge interactif sur le produit */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur-md transition-colors group-hover:border-fuchsia-400 group-hover:bg-fuchsia-950/80">
            <span>Pré-commander</span>
            <Icon name="external" size={13} className="text-fuchsia-300" />
          </div>
        </Link>

        {/* Indicateurs de pagination (Dots) */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {ARTICLES.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => setActiveIndex(dotIdx)}
              aria-label={`Aller à l'article ${dotIdx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIdx === activeIndex
                  ? "w-6 bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
                  : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Barre des 4 métriques clés façon Apple Specs */}
      <div className="mt-5 px-5">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center backdrop-blur-md">
          {article.metrics.map((metric, mIdx) => {
            const isBordered = mIdx > 0;
            if (metric.href) {
              return (
                <Link
                  key={metric.label}
                  href={metric.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex flex-col items-center ${isBordered ? "border-l border-white/10" : ""}`}
                >
                  <span className="flex items-center gap-0.5 font-display text-lg tracking-wide text-fuchsia-300 group-hover:text-fuchsia-200">
                    {metric.value}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">
                    {metric.label}
                  </span>
                </Link>
              );
            }
            return (
              <div
                key={metric.label}
                className={`flex flex-col items-center ${isBordered ? "border-l border-white/10" : ""}`}
              >
                <span className="font-display text-lg tracking-wide text-white">
                  {metric.value}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-purple-200/60 font-semibold">
                  {metric.label}
                </span>
              </div>
            );
          })}
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
            <span className="text-[15px] font-bold tracking-wide">
              {article.buttonLabel}
            </span>
            <Icon name="external" size={16} />
          </div>
        </Link>
        <p className="mt-2 text-center text-[11.5px] text-white/50">
          Paiement sécurisé et sélection des tailles sur notre boutique club HelloAsso
        </p>
      </div>

      {/* Récit de conception officiel */}
      <div className="mt-8 px-5">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-fuchsia-400">
            <Icon name={article.icon} size={18} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">
              {article.narrativeBadge}
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-purple-100/90 font-medium">
            {article.narrativeP1}
          </p>

          <p className="mt-2.5 text-[12.5px] leading-relaxed text-purple-200/70">
            {article.narrativeP2}
          </p>
        </div>
      </div>

      {/* Guide des tailles / Coupe / Chamois */}
      <div className="mt-6 mb-8 px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-bold text-fuchsia-300">
                i
              </span>
              <span className="text-[13px] font-bold text-white">
                {article.featureTitle}
              </span>
            </div>
            <Link
              href={article.featureGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-fuchsia-300 hover:text-fuchsia-200"
            >
              <span>{article.featureGuideText}</span>
              <Icon name="external" size={12} />
            </Link>
          </div>

          <p className="mt-2.5 text-[12px] leading-relaxed text-white/70">
            {article.featureDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
