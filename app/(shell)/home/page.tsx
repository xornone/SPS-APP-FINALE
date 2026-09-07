import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { HomeRidesSection } from "@/components/HomeRidesSection";
import { isPastDate } from "@/lib/format";

// Page 100% publique (aucune donnee liee a une session, voir
// lib/supabase/publicClient.ts), mais rendue a chaque requete plutot que
// mise en cache : le club prefere voir l'app se mettre a jour a chaque
// clic (changement d'onglet, ouverture d'une sortie, retour arriere)
// plutot que de gagner quelques dixiemes de seconde avec un cache qui peut
// rester perime le temps de sa fenetre de revalidation.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createPublicClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  // Toutes les sorties du jour le plus proche sont mises en avant (en
  // violet) — pas seulement la premiere — si plusieurs sorties ont lieu le
  // meme jour.
  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));
  const nextDate = upcoming[0]?.ride_date;
  const featured = upcoming.filter((r) => r.ride_date === nextDate);
  // Le reste des sorties a venir (Accueil et Sorties etaient deux onglets
  // distincts qui affichaient en partie les memes sorties ; desormais un
  // seul onglet, avec la liste complete — plus de plafond a 4 — et les
  // filtres qu'avait l'onglet Sorties, places en haut de page par
  // HomeRidesSection).
  const rest = upcoming.filter((r) => r.ride_date !== nextDate);

  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Bonjour 👋</h1>
      </div>
      <HomeRidesSection featured={featured} rest={rest} participations={participations} />
    </div>
  );
}
