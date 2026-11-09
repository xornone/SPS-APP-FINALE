"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { isPreorderOpenToPublic } from "@/lib/preorder";
import { hapticTap } from "@/lib/haptics";

const TABS = [
  { href: "/home", label: "Accueil", icon: "home" as const },
  { href: "/precommandes", label: "Pré-commandes", icon: "shirt" as const, preorderTab: true },
  { href: "/classement", label: "Stats SPS", icon: "trophy" as const },
  { href: "/admin", label: "Admin", icon: "gear" as const },
];

/**
 * Détermine si un onglet est visuellement actif.
 * Pour "Accueil", la page de détail d'une sortie (/rides/...) fait partie de la section Accueil,
 * donc le badge violet doit être allumé sur Accueil.
 */
function isTabActive(tabHref: string, currentPath: string): boolean {
  if (tabHref === "/home") {
    return (
      currentPath === "/home" ||
      currentPath === "/" ||
      currentPath.startsWith("/rides")
    );
  }
  if (tabHref === "/classement") {
    return (
      currentPath === "/classement" ||
      currentPath.startsWith("/classement/")
    );
  }
  return currentPath === tabHref || currentPath.startsWith(tabHref + "/");
}

/**
 * Détermine si l'utilisateur est DÉJÀ exactement sur la racine de cet onglet.
 * Seul ce cas déclenche un scroll-to-top.
 * Si l'utilisateur est sur /rides/... (détail d'une sortie), il n'est PAS sur la racine /home :
 * un clic sur "Accueil" DOIT naviguer vers /home.
 */
function isExactRootTab(tabHref: string, currentPath: string): boolean {
  if (tabHref === "/home") {
    return currentPath === "/home" || currentPath === "/";
  }
  return currentPath === tabHref;
}

export function BottomNav() {
  const pathname = usePathname();
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }

  const isAdmin = useIsAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastNavTimeRef = useRef<number>(0);

  // Synchroniser et nettoyer le chemin optimiste dès que la navigation aboutit
  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  // Observer la présence d'une modale ouverte pour masquer proprement la barre
  useEffect(() => {
    const checkModal = () => {
      setModalOpen(typeof document !== "undefined" && document.body.classList.contains("modal-open"));
    };
    checkModal();
    window.addEventListener("sps-modal-toggle", checkModal);

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
      observer = new MutationObserver(checkModal);
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      window.removeEventListener("sps-modal-toggle", checkModal);
      if (observer) observer.disconnect();
    };
  }, []);

  const triggerNavigation = useCallback(
    (href: string, isCurrentRoot: boolean) => {
      lastNavTimeRef.current = Date.now();

      // Si l'utilisateur est déjà sur la page racine exacte : scroll fluide vers le haut
      if (isCurrentRoot) {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        hapticTap(4);
        return;
      }

      // Retour haptique immédiat pour confirmer la prise en compte du tap
      hapticTap(8);

      // Transition optimiste instantanée (0ms de latence visuelle perçue)
      setOptimisticPath(href);

      if (router && typeof router.push === "function") {
        startTransition(() => {
          router.push(href);
        });
      }
    },
    [router]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, href: string, isCurrentRoot: boolean) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Détection d'un tap tactile franc (déplacement max 18px, durée < 450ms)
    // Permet d'éliminer les faux négatifs d'iOS Safari (qui annule le clic lors d'un micro-roulement du pouce)
    if (dx < 18 && dy < 18 && duration < 450) {
      triggerNavigation(href, isCurrentRoot);
    }
  };

  const handleClick = (e: React.MouseEvent, href: string, isCurrentRoot: boolean) => {
    // Si déjà géré par le touchEnd tactile il y a moins de 600ms, empêcher l'action doublon
    if (Date.now() - lastNavTimeRef.current < 600) {
      e.preventDefault();
      return;
    }

    // Préserver le comportement natif lors des clics avec touches modificatrices (Cmd, Ctrl, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    triggerNavigation(href, isCurrentRoot);
  };

  if (modalOpen) return null;

  const isPreorderOpen = isPreorderOpenToPublic();
  const visibleTabs = TABS.filter((t) => {
    if (t.preorderTab && !isAdmin && !isPreorderOpen) return false;
    return true;
  });
  const activePath = optimisticPath || pathname;

  return (
    <div
      data-bottom-nav
      className="bottom-nav-container fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-4 z-40 mx-auto max-w-sm pointer-events-none will-change-transform"
    >
      <nav className="pointer-events-auto flex items-center justify-around gap-1 rounded-full border border-black/[0.08] bg-white/85 p-1.5 backdrop-blur-2xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04] transition-colors dark:border-white/15 dark:bg-[#0F0A1A]/85 dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] dark:ring-white/10">
        {visibleTabs.map((t) => {
          const isCurrentRoot = isExactRootTab(t.href, pathname);
          const active = isTabActive(t.href, activePath);
          const isNavigatingToThisTab = isPending && optimisticPath === t.href;

          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={true}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, t.href, isCurrentRoot)}
              onClick={(e) => handleClick(e, t.href, isCurrentRoot)}
              className={`group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 select-none touch-manipulation transition-all duration-200 active:scale-95 ${
                active
                  ? "text-violet-700 dark:text-white"
                  : "text-neutral-400 hover:text-neutral-800 dark:text-white/40 dark:hover:text-white/80"
              }`}
            >
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-sps-violet600 to-[#AA26FF] text-white shadow-lg shadow-violet-600/40 ring-1 ring-white/30"
                    : "bg-transparent group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.04]"
                }`}
              >
                <Icon
                  name={t.icon}
                  size={18}
                  className={isNavigatingToThisTab ? "animate-pulse" : ""}
                />
                {isNavigatingToThisTab && (
                  <span className="absolute top-1 right-2.5 h-1.5 w-1.5 rounded-full bg-white shadow-sm animate-ping" />
                )}
              </span>
              <span
                className={`text-[10px] tracking-tight whitespace-nowrap transition-colors duration-200 ${
                  active ? "font-extrabold text-violet-700 dark:text-white" : "font-semibold"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
