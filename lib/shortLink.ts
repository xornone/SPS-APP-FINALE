// Code court derive d'un ride_id (uuid) pour des liens plus lisibles dans
// les messages partages (WhatsApp, etc.) : on retire les tirets et on
// garde les 8 premiers caracteres. La route /s/[code] fait la resolution
// inverse (recherche, parmi les sorties existantes, de celle dont l'id
// commence par ce prefixe).
export function shortRideCode(rideId: string): string {
  return rideId.replace(/-/g, "").slice(0, 8);
}
