export type GroupLevel = "vert" | "rouge" | "violet";

export const GROUP_INFO: Record<GroupLevel, { label: string; range: string; hex: string }> = {
  vert: { label: "Vert", range: "24–26 km/h", hex: "#1F9D63" },
  rouge: { label: "Rouge", range: "26–27 km/h", hex: "#DC3D3D" },
  violet: { label: "Violet", range: "28+ km/h", hex: "#7C3AED" },
};

export interface RideGroup {
  ride_id: string;
  group_level: GroupLevel;
  target_speed: string;
}

export interface Ride {
  id: string;
  title: string;
  description: string;
  ride_date: string; // YYYY-MM-DD
  ride_time: string; // HH:MM:SS
  place: string;
  distance_km: number;
  elevation_gain_m: number;
  strava_url: string | null;
  gpx_path: string | null;
  route_points: [number, number][] | null; // [lat, lon]
  route_elevations: number[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ride_groups?: RideGroup[];
}

// Une inscription = juste un nom + un groupe, sans compte. `id` sert de
// jeton de reconciliation cote client (localStorage) pour retrouver "ma"
// participation d'un navigateur a l'autre chargement de page.
export interface Participation {
  id: string;
  ride_id: string;
  participant_name: string;
  group_level: GroupLevel;
  created_at: string;
}

export interface Notification {
  id: string;
  kind: "ride_created" | "ride_updated" | "ride_cancelled" | "new_participant";
  ride_id: string | null;
  message: string;
  created_at: string;
}
