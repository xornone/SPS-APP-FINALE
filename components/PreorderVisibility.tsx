"use client";

import { useEffect, useState } from "react";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { isPreorderOpenToPublic } from "@/lib/preorder";

/**
 * Affiche son contenu :
 * 1. Aux administrateurs connectés à tout moment (avant et après l'ouverture).
 * 2. À tous les utilisateurs dès l'ouverture officielle (mardi 10 novembre 2026 à 21h00).
 */
export function PreorderVisibility({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(isPreorderOpenToPublic());

  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      if (isPreorderOpenToPublic()) {
        setIsOpen(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (isOpen || isAdmin) {
    return <>{children}</>;
  }

  return null;
}
