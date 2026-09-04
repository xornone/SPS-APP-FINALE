import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRides } from "@/lib/queries";

// Lien court partage dans les messages (WhatsApp, etc.) :
// /s/{8 premiers caracteres de l'id sans tirets} -> redirige vers la
// fiche sortie complete /rides/{id}. Pas de nouvelle table : on retrouve
// simplement, parmi les sorties existantes, celle dont l'id commence par
// ce prefixe — largement suffisant pour le volume d'un club.
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const code = params.code.toLowerCase();
  const supabase = createClient();
  const rides = await fetchRides(supabase);
  const match = rides.find((r) => r.id.replace(/-/g, "").startsWith(code));
  const dest = match ? `/rides/${match.id}` : "/rides";
  return NextResponse.redirect(new URL(dest, request.url));
}
