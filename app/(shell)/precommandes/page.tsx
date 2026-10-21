import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreorderShowcase } from "@/components/PreorderShowcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Précommandes SPS 2027 — Collection Cyclisme & Running",
  description:
    "Découvrez et précommandez la collection officielle SPS 2027 : maillots CX SCA & Pulse, cuissard X, gilet Plus 2.0 et t-shirt running Flash.",
};

export default async function PrecommandesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/precommandes");
  }

  return <PreorderShowcase />;
}
