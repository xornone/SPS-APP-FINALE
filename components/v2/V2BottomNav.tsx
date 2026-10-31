"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";

const TABS = [
  { href: "/v2/home", label: "Accueil", icon: "home" as const },
  { href: "/precommandes", label: "Pré-commandes", icon: "shirt" as const, adminOnly: true },
  { href: "/v2/classement", label: "Stats SPS", icon: "trophy" as const },
  { href: "/admin", label: "Admin", icon: "gear" as const },
];

export function V2BottomNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-sm pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-around gap-1 rounded-full border border-black/[0.08] bg-white/85 p-1.5 backdrop-blur-2xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04] transition-colors dark:border-white/15 dark:bg-[#0F0A1A]/85 dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7)] dark:ring-white/10">
        {visibleTabs.map((t) => {
          const active =
            pathname === t.href ||
            (t.href !== "/v2/home" && pathname.startsWith(t.href + "/")) ||
            (t.href === "/v2/home" && (pathname === "/v2" || pathname.startsWith("/v2/rides")));
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={true}
              className={`group relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 transition-all duration-200 active:scale-95 ${
                active
                  ? "text-violet-700 dark:text-white"
                  : "text-neutral-400 hover:text-neutral-800 dark:text-white/40 dark:hover:text-white/80"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-sps-violet600 to-[#AA26FF] text-white shadow-lg shadow-violet-600/40 ring-1 ring-white/30"
                    : "bg-transparent group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.04]"
                }`}
              >
                <Icon name={t.icon} size={18} />
              </span>
              <span className={`text-[10px] tracking-tight whitespace-nowrap ${active ? "font-extrabold text-violet-700 dark:text-white" : "font-semibold"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
