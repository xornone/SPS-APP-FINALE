"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";

const THRESHOLD = 65;
const MAX_PULL = 95;

export function PullToRefresh() {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullYRef = useRef(0);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    // --- Touch handlers (Mobile & Emulators) ---
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || startXRef.current === null || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Seulement si le mouvement est principalement vertical vers le bas et au sommet de la page
      if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX) && window.scrollY <= 0) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }

        // Amortissement élastique logarithmique / exponentiel
        const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.82) * 1.6);
        pullYRef.current = damped;
        setPullY(damped);

        if (e.cancelable) {
          e.preventDefault();
        }
      } else if (diffY <= 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
        }
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const handleTouchEnd = () => {
      if (startYRef.current === null) return;
      startYRef.current = null;
      startXRef.current = null;

      const currentPull = pullYRef.current;
      const wasPulling = isPullingRef.current;

      isPullingRef.current = false;
      setIsPulling(false);

      if (wasPulling && currentPull >= THRESHOLD && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        pullYRef.current = 48;
        setPullY(48);

        // Feedback haptique subtil si supporté
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(15);
          }
        } catch {
          // Ignorer si non supporté
        }

        // Rafraîchir les données de la page
        router.refresh();

        setTimeout(() => {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          pullYRef.current = 0;
          setPullY(0);
        }, 850);
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    // --- Mouse drag handlers (Desktop testable) ---
    const handleMouseDown = (e: MouseEvent) => {
      // Actif seulement si clic gauche tout en haut de la page (les 100 premiers pixels)
      if (e.button === 0 && window.scrollY <= 0 && e.clientY < 100 && !isRefreshingRef.current) {
        // Ne pas déclencher si on clique sur un bouton ou lien
        const target = e.target as HTMLElement | null;
        if (target && (target.closest("button") || target.closest("a") || target.closest("input"))) {
          return;
        }
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (startYRef.current === null || startXRef.current === null || isRefreshingRef.current) return;
      const diffY = e.clientY - startYRef.current;
      const diffX = e.clientX - startXRef.current;

      if (diffY > 10 && Math.abs(diffY) > Math.abs(diffX) && window.scrollY <= 0) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }
        const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.82) * 1.6);
        pullYRef.current = damped;
        setPullY(damped);
      }
    };

    const handleMouseUp = () => {
      if (startYRef.current !== null) {
        handleTouchEnd();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [router]);

  if (pullY === 0 && !isRefreshing) return null;

  const isReady = pullY >= THRESHOLD;
  const progress = Math.min(1, pullY / THRESHOLD);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-1/2 z-50 flex -translate-x-1/2 items-center justify-center"
      style={{
        top: `${Math.max(12, pullY)}px`,
        opacity: isRefreshing ? 1 : progress,
        transform: `translate(-50%, 0) scale(${isReady ? 1.08 : 0.92 + progress * 0.1})`,
        transition: isPulling ? "none" : "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/95 shadow-xl backdrop-blur-md transition-colors dark:border-white/15 dark:bg-[#1A1422]/95">
        <Icon
          name="refresh"
          size={18}
          className={`transition-colors duration-200 ${
            isRefreshing
              ? "animate-spin text-sps-violet600 dark:text-sps-violet400"
              : isReady
              ? "text-sps-violet600 dark:text-sps-violet400"
              : "text-black/40 dark:text-white/40"
          }`}
          style={
            !isRefreshing
              ? {
                  transform: `rotate(${pullY * 4.5}deg)`,
                  transition: isPulling ? "none" : "transform 0.2s ease",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
