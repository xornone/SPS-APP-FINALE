// Liste restreinte des comptes admin autorises a envoyer une notification
// push manuelle depuis l'onglet Admin (voir components/AdminNotificationComposer.tsx
// et app/api/admin/notifications/send/route.ts) — a la demande explicite de
// Thomas, qui veut garder cet envoi (visible par TOUS les abonnes du club,
// contrairement au reste de l'admin qui n'affecte qu'une sortie) limite a
// lui-meme et Duc. Les autres admins gardent tout le reste de l'onglet
// Admin (CRUD sorties, Strava) : cette restriction ne concerne que la
// section Notifications.
const NOTIFICATION_ADMIN_EMAILS = ["th.tregaro@gmail.com", "nguyen.huuduc34200@gmail.com"];

export function isNotificationAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return NOTIFICATION_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
