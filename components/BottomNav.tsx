"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

// L'app est publique pour tout le monde : pas de distinction de role a
// l'affichage. L'onglet Admin mene vers une page protegee par le
// middleware (redirection /login si pas de session), donc il est toujours
// visible mais ne s'ouvre reellement que pour l'administrateur.
const TABS = [
  { href: "/home", label: "Accueil", icon: "home" as const },
  { href: "/rides", label: "Sorties", icon: "bike" as const },
  { href: "/classement", label: "Classement", icon: "trophy" as const },
  { href: "/admin", label: "Admin", icon: "gear" as const },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 flex gap-0.5 border-t border-black/5 bg-white/90 px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur dark:border-white/10 dark:bg-[#1A1422]/90">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10.5px] font-bold ${
              active ? "text-sps-violet600 dark:text-sps-violet400" : "text-black/35 dark:text-white/35"
            }`}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
