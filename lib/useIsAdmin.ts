"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sait si l'utilisateur courant est admin (toute session valide = admin,
 * voir lib/adminGuard.ts), verifie 100% cote client via getSession()
 * (lecture locale du jeton deja stocke par le navigateur, aucun appel
 * reseau). Sert a afficher un element reserve a l'admin (bouton WhatsApp,
 * suppression de n'importe quel message) SANS forcer la page qui l'utilise
 * en rendu dynamique cote serveur pour ça — ce qui l'empecherait d'etre
 * mise en cache.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) setIsAdmin(!!session);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
