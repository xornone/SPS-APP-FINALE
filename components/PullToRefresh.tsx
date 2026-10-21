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
    const cleanupTouch = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };

    const cleanupMouse = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    const triggerRefresh = () => {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      pullYRef.current = 48;
      setPullY(48);

      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(15);
        }
      } catch {
        // Ignorer si non supporté
      }

      router.refresh();

      setTimeout(() => {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        pullYRef.current = 0;
        setPullY(0);
      }, 850);
    };

    // --- Touch handlers (dynamiquement attachés pour préserver le 120 FPS natif) ---
    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || startXRef.current === null || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Si l'utilisateur tire vers le bas au sommet de la page
      if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX) && window.scrollY <= 0) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }

        const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.82) * 1.6);
        pullYRef.current = damped;
        setPullY(damped);

        if (e.cancelable) {
          e.preventDefault();
        }
      } else if (diffY <= 0) {
        // L'utilisateur scroll vers le haut/contenu : libérer immédiatement les écouteurs
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
        }
        pullYRef.current = 0;
        setPullY(0);
        cleanupTouch();
      }
    };

    const handleTouchEnd = () => {
      cleanupTouch();
      if (startYRef.current === null) return;
      startYRef.current = null;
      startXRef.current = null;

      const currentPull = pullYRef.current;
      const wasPulling = isPullingRef.current;

      isPullingRef.current = false;
      setIsPulling(false);

      if (wasPulling && currentPull >= THRESHOLD && !isRefreshingRef.current) {
        triggerRefresh();
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // N'activer QUE si on est tout en haut de page et pas déjà en cours de refresh
      if (window.scrollY <= 0 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;

        // Attache les événements touchmove SEULEMENT pendant le geste
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      }
    };

    // --- Mouse handlers (Desktop testable, attachés dynamiquement) ---
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
      } else if (diffY <= 0) {
        cleanupMouse();
      }
    };

    const handleMouseUp = () => {
      cleanupMouse();
      if (startYRef.current !== null) {
        handleTouchEnd();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && window.scrollY <= 0 && e.clientY < 100 && !isRefreshingRef.current) {
        const target = e.target as HTMLElement | null;
        if (target && (target.closest("button") || target.closest("a") || target.closest("input"))) {
          return;
        }
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
    };

    // Uniquement les écouteurs passifs minimaux de départ
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("mousedown", handleMouseDown);
      cleanupTouch();
      cleanupMouse();
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
