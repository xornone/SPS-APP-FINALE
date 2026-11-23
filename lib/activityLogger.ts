import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityAction =
  // Membres
  | "ride_join"
  | "ride_leave"
  | "ride_change_group"
  | "poll_vote"
  | "poll_unvote"
  | "comment_add"
  | "comment_delete"
  | "suggestion_add"
  | "push_subscribe"
  // Admins
  | "admin_set_captain"
  | "admin_remove_captain"
  | "admin_create_ride"
  | "admin_update_ride"
  | "admin_delete_ride"
  | "admin_delete_participant"
  | "admin_send_notification"
  | "admin_create_poll"
  | "admin_update_poll"
  | "admin_delete_poll";

export interface ActivityLogInput {
  actorType: "admin" | "member";
  actorName: string;
  actorEmail?: string | null;
  actorId?: string | null;
  clientToken?: string | null;
  action: ActivityAction | string;
  targetType: "ride" | "poll" | "comment" | "suggestion" | "notification" | "participant" | "system";
  targetId?: string | null;
  targetTitle?: string | null;
  details?: Record<string, any>;
  request?: Request;
}

export function extractClientInfo(request?: Request): { ip: string | null; userAgent: string | null } {
  try {
    if (request) {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip =
        forwarded?.split(",")[0]?.trim() ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip") ||
        null;
      const userAgent = request.headers.get("user-agent") || null;
      return { ip, userAgent };
    }

    const headerList = headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      headerList.get("cf-connecting-ip") ||
      headerList.get("x-real-ip") ||
      null;
    const userAgent = headerList.get("user-agent") || null;
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Enregistre une action dans le journal d'activité SPS (Supabase table activity_logs).
 * Ne bloque jamais l'exécution normale en cas d'erreur.
 */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  const { ip, userAgent } = extractClientInfo(input.request);

  // 1. Log console immédiat (visible dans les logs Vercel)
  console.log(
    `[ACTIVITY] [${input.actorType.toUpperCase()}] ${input.actorName}${
      input.actorEmail ? ` (${input.actorEmail})` : ""
    } -> ${input.action} on ${input.targetType}:${input.targetTitle || input.targetId || "global"}`,
    input.details || {}
  );

  // 2. Écriture en base Supabase
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("activity_logs").insert({
      actor_type: input.actorType,
      actor_name: input.actorName,
      actor_email: input.actorEmail || null,
      actor_id: input.actorId || null,
      client_token: input.clientToken || null,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId || null,
      target_title: input.targetTitle || null,
      details: input.details || {},
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.warn("[ACTIVITY] Supabase log warning:", error.message);
    }
  } catch (err: any) {
    console.warn("[ACTIVITY] Erreur silencieuse lors de l'enregistrement de l'activité:", err?.message || err);
  }
}
