import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReminderMessage, sendRideReminder, sendTomorrowRidesReminders, getTomorrowDateString } from "@/lib/rideReminder";
import type { Ride } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET : Prépare et prévisualise le rappel pour la prochaine sortie ou demain
 * POST : Déclenche l'envoi du rappel
 */
export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const rideId = searchParams.get("rideId");

    const supabase = createAdminClient();
    let ride: Ride | null = null;

    if (rideId) {
      const { data } = await supabase.from("rides").select("*, ride_groups(*)").eq("id", rideId).maybeSingle();
      ride = data as Ride | null;
    } else {
      // Chercher d'abord les sorties de demain
      const tomorrow = getTomorrowDateString();
      const { data: tomorrowRides } = await supabase
        .from("rides")
        .select("*, ride_groups(*)")
        .eq("ride_date", tomorrow)
        .order("ride_time", { ascending: true })
        .limit(1);

      if (tomorrowRides && tomorrowRides.length > 0) {
        ride = tomorrowRides[0] as Ride;
      } else {
        // Sinon, chercher la prochaine sortie à venir
        const today = new Date().toISOString().slice(0, 10);
        const { data: upcoming } = await supabase
          .from("rides")
          .select("*, ride_groups(*)")
          .gte("ride_date", today)
          .order("ride_date", { ascending: true })
          .limit(1);

        if (upcoming && upcoming.length > 0) {
          ride = upcoming[0] as Ride;
        }
      }
    }

    if (!ride) {
      return NextResponse.json({ preview: null, message: "Aucune sortie à venir trouvée." });
    }

    const preview = await buildReminderMessage(ride);
    return NextResponse.json({
      preview,
      ride: {
        id: ride.id,
        title: ride.title,
        date: ride.ride_date,
        time: ride.ride_time,
        place: ride.place,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const rideId = body?.rideId;

    if (rideId) {
      const supabase = createAdminClient();
      const { data: ride, error } = await supabase.from("rides").select("*, ride_groups(*)").eq("id", rideId).single();
      if (error || !ride) {
        return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
      }

      const result = await sendRideReminder(ride as Ride);
      return NextResponse.json({ ok: true, sent: 1, message: result.payload.body });
    }

    // Sinon envoie pour toutes les sorties prévues demain
    const results = await sendTomorrowRidesReminders();
    const count = results.filter((r) => r.sent).length;

    return NextResponse.json({
      ok: true,
      sent: count,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
