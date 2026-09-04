"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icons";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="mx-5 mb-8 flex items-center justify-center gap-2 rounded-2xl border border-black/10 py-3 text-[13px] font-bold text-black/55 dark:border-white/15 dark:text-white/55"
    >
      <Icon name="logout" size={16} /> Se déconnecter
    </button>
  );
}
