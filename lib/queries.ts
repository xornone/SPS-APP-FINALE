import type { SupabaseClient } from "@supabase/supabase-js";
import type { Participation, Ride } from "./types";

export async function fetchRides(supabase: SupabaseClient): Promise<Ride[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*, ride_groups(*)")
    .order("ride_date", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as Ride[];
}

export async function fetchRide(supabase: SupabaseClient, id: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from("rides")
    .select("*, ride_groups(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Ride | null;
}

// Lit la vue publique ride_participants (jamais la table participations
// directement : elle porte le client_token, qui ne doit pas fuiter).
export async function fetchParticipationsForRide(
  supabase: SupabaseClient,
  rideId: string
): Promise<Participation[]> {
  const { data, error } = await supabase
    .from("ride_participants")
    .select("*")
    .eq("ride_id", rideId)
    .order("participant_name");
  if (error) throw error;
  return (data || []) as unknown as Participation[];
}

export async function fetchAllParticipations(supabase: SupabaseClient): Promise<Participation[]> {
  const { data, error } = await supabase.from("ride_participants").select("*");
  if (error) throw error;
  return (data || []) as unknown as Participation[];
}
