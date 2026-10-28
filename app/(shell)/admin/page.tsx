import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { AdminRidesList } from "@/components/AdminRidesList";
import { AdminNotificationComposer } from "@/components/AdminNotificationComposer";
import { isNotificationAdmin } from "@/lib/notificationAdmins";
import { LogoutButton } from "@/components/LogoutButton";
import { Icon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getMyStravaConnection } from "@/lib/strava";
import { StravaConnectPanel } from "@/components/StravaConnectPanel";

// Deja rendue dynamiquement de fait (createClient() appelle cookies()),
// mais explicite ici comme sur le reste des pages admin qui doivent
// refleter l'etat courant (compte Strava connecte, sorties a jour) sans
// dependre d'un detail d'implementation qui pourrait changer.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reqHeaders = headers();
  const headerUserId = reqHeaders.get("x-user-id");
  const headerUserEmail = reqHeaders.get("x-user-email");

  const supabase = createClient();

  // Si l'utilisateur est déjà validé par le middleware, on évite l'appel réseau
  // supplémentaire supabase.auth.getUser() qui bloquait le rendu.
  const userPromise = headerUserId
    ? Promise.resolve({ id: headerUserId, email: headerUserEmail })
    : supabase.auth.getUser().then(({ data }) => (data.user ? { id: data.user.id, email: data.user.email } : null));

  // Toutes les requêtes s'exécutent en parallèle immédiat
  const [user, rides, participations, stravaConnection] = await Promise.all([
    userPromise,
    fetchRides(supabase),
    fetchAllParticipations(supabase),
    headerUserId
      ? getMyStravaConnection(headerUserId)
      : userPromise.then((u) => (u ? getMyStravaConnection(u.id) : null)),
  ]);

  const sorted = [...rides].sort((a, b) => (a.ride_date < b.ride_date ? 1 : -1));
  const counts: Record<string, number> = {};
  participations.forEach((p) => (counts[p.ride_id] = (counts[p.ride_id] || 0) + 1));

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div>
          <h1 className="font-display text-[26px] tracking-wide">Administration</h1>
          <p className="text-[12.5px] text-black/45 dark:text-white/45">Créer et gérer les sorties du club.</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Contacts d'urgence — Document Google Sheets réservé aux administrateurs */}
      <div className="px-5 pb-5">
        <a
          href="https://docs.google.com/spreadsheets/d/1ZKinNrAhNPi0czM71h459u6gjVg1jtcyNcrkKvcc1Kc/edit?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 shadow-cardSm transition-all duration-200 hover:border-rose-500/40 hover:shadow active:scale-[0.99] dark:border-rose-400/20 dark:from-rose-500/15 dark:via-rose-500/10"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300">
              <Icon name="phone" size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-[15px] font-bold tracking-wide text-black dark:text-white">
                  Contacts d&apos;urgence
                </span>
                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
                  ICE
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-black/55 dark:text-white/55">
                Tableau des numéros et personnes à contacter en cas d&apos;urgence
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-black/40 transition-colors group-hover:bg-rose-500 group-hover:text-white dark:bg-white/[0.06] dark:text-white/40 dark:group-hover:bg-rose-500 dark:group-hover:text-white">
            <Icon name="external" size={15} />
          </div>
        </a>
      </div>

      <div className="px-5 pb-5">
        <h2 className="mb-2 font-display text-lg tracking-wide">Ton compte Strava</h2>
        <p className="mb-2 text-[11.5px] text-black/40 dark:text-white/40">
          Connecte ton compte pour importer automatiquement le tracé GPX d’une sortie depuis un lien Strava, à la
          création de la sortie. Chaque admin ne voit que sa propre connexion.
        </p>
        <Suspense fallback={null}>
          <StravaConnectPanel connection={stravaConnection} />
        </Suspense>
      </div>

      {isNotificationAdmin(user?.email) && (
        <div className="px-5 pb-5">
          <h2 className="mb-2 font-display text-lg tracking-wide">Notifications</h2>
          <p className="mb-2 text-[11.5px] text-black/40 dark:text-white/40">
            Envoie un message push à tous les membres ayant activé les notifications.
          </p>
          <AdminNotificationComposer />
        </div>
      )}

      <AdminRidesList rides={sorted} counts={counts} />

      <LogoutButton />

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-5">
        <Link
          href="/admin/rides/new"
          prefetch={true}
          className="pointer-events-auto ml-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 text-white shadow-lg"
        >
          <Icon name="plus" size={24} />
        </Link>
      </div>
    </div>
  );
}
