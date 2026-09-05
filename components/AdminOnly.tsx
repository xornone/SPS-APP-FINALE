"use client";

import { useIsAdmin } from "@/lib/useIsAdmin";

/**
 * N'affiche ses enfants que si l'utilisateur est admin. Verification
 * cote client (voir lib/useIsAdmin.ts) : les visiteurs (l'immense
 * majorite) ne voient jamais rien s'afficher ici, et la page qui
 * l'entoure reste cacheable puisqu'elle n'a plus besoin de connaitre la
 * session cote serveur pour ça.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return <>{children}</>;
}
