import webpush from "web-push";
import { createAdminClient } from "./supabase/admin";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Cles VAPID manquantes (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }
  // Doit etre une URL mailto: ou https: (specification VAPID) — on reutilise
  // l'URL du site, deja en variable d'env, plutot que d'en ajouter une
  // dediee juste pour ca.
  const subject = process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  // Chemin ouvert au clic sur la notification (ex: "/rides/<id>").
  url?: string;
}

/**
 * Envoie une notification push a tous les abonnes enregistres (nouvelle
 * sortie, sortie modifiee, ou message libre depuis l'admin). Best-effort et
 * silencieux par design : jamais appele avec un await qui ferait echouer
 * l'action principale (creation/modification de sortie) si l'envoi des
 * notifications a un probleme — chaque appelant doit l'entourer d'un
 * try/catch (voir app/api/admin/rides/route.ts). Un abonnement expire ou
 * revoque par le navigateur (404/410) est supprime silencieusement ; les
 * autres erreurs sont juste loguees.
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  try {
    configureWebPush();
  } catch (err) {
    console.error("[push] configuration manquante :", err);
    return;
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (error) {
    console.error("[push] impossible de lire les abonnements :", error.message);
    return;
  }
  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, json);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement perime (desinstalle, permission revoquee...) : on le
          // retire pour ne pas re-essayer indefiniment dans le vide.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] echec d'envoi a un abonne :", (err as Error)?.message || err);
        }
      }
    })
  );
}
