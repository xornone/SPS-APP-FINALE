// Liste des membres administrateurs du club. Il n'existe pas de compte
// membre (voir supabase/migrations/0001_init.sql : toute session
// authentifiee EST admin) : cette liste sert uniquement a reperer, parmi
// les inscrits d'une sortie (un simple nom saisi librement), lesquels
// correspondent a un administrateur — pour en afficher le nombre aux autres
// admins sur l'onglet Accueil.
export const ADMIN_NAMES = [
  "Thomas Trégaro",
  "Duc Nguyen",
  "Tanguy Delacôte",
  "Margaux Dirat",
  "Aymeric Closier",
  "Franck Georges",
  "Martin Lemmens",
];

// Comparaison tolerante a la casse et aux accents, puisque le nom d'un
// participant est saisi librement (pas de compte, pas de liste deroulante).
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const NORMALIZED_ADMIN_NAMES = new Set(ADMIN_NAMES.map(normalize));

export function isAdminName(name: string): boolean {
  return NORMALIZED_ADMIN_NAMES.has(normalize(name));
}

export function countRegisteredAdmins(participantNames: string[]): number {
  return participantNames.filter(isAdminName).length;
}
