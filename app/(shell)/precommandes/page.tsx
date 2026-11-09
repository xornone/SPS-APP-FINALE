import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreorderShowcase } from "@/components/PreorderShowcase";
import { isPreorderOpenToPublic } from "@/lib/preorder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Collection Officielle",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : maillots CX SCA & Pulse, cuissard X, gilet Plus 2.0 et t-shirt Flash.",
};

export default async function PrecommandesPage() {
  // Avant la date d'ouverture publique officielle (mardi 10 nov 2026 à 21h00),
  // l'accès est restreint aux administrateurs connectés.
  if (!isPreorderOpenToPublic()) {
    const reqHeaders = headers();
    const headerUserId = reqHeaders.get("x-user-id");

    if (!headerUserId) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login?next=/precommandes");
      }
    }
  }

  return <PreorderShowcase />;
}
