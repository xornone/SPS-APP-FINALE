"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();
    window.addEventListener("sps-theme-change", syncTheme);
    return () => window.removeEventListener("sps-theme-change", syncTheme);
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const nextDark = !isCurrentlyDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sps-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sps-theme", "light");
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", nextDark ? "#130D1A" : "#FBF9FC");
    }

    window.dispatchEvent(new Event("sps-theme-change"));
  };

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`h-9 w-9 rounded-xl border border-black/[0.08] bg-white/60 dark:border-white/10 dark:bg-[#1A1422]/60 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Mode nuit (cliquer pour le mode jour)" : "Mode jour (cliquer pour le mode nuit)"}
      title={isDark ? "Mode nuit (cliquer pour le mode jour)" : "Mode jour (cliquer pour le mode nuit)"}
      className={`relative z-10 flex h-9 w-9 cursor-pointer touch-manipulation select-none items-center justify-center rounded-xl border border-black/[0.08] bg-white shadow-cardSm transition-all duration-200 hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-[#1A1422] ${className}`}
    >
      {isDark ? (
        <Icon
          name="moon"
          size={16}
          className="text-sps-violet400 transition-transform duration-300 hover:-rotate-12"
        />
      ) : (
        <Icon
          name="sun"
          size={17}
          className="text-amber-500 transition-transform duration-300 hover:rotate-45"
        />
      )}
    </button>
  );
}
